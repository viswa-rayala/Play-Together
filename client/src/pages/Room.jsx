import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { LogOut, Crown, UserCircle, Download, Loader2, WifiOff, Wifi } from 'lucide-react';
import MediaPlayer from '../components/MediaPlayer';
import RoomInfo from '../components/RoomInfo';
import HostControls from '../components/HostControls';
import ConnectionStatus from '../components/ConnectionStatus';
import socketService from '../services/socket';
import { saveMediaFile, loadMediaFile, clearMediaFile, updateSavedTime } from '../services/mediaStorage';

/**
 * Room Page — Shared media room
 *
 * HOST VIEW   (?host=1): full controls, file picker, play/pause/seek
 * PARTICIPANT VIEW:       read-only player — receives file chunks from host
 *                         and syncs playback in real time via Socket.io
 */
export default function Room() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerRef = useRef(null);

  const isHost = searchParams.get('host') === '1';

  // ── State ──────────────────────────────────────────────────
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [participants, setParticipants] = useState(0);
  const [media, setMedia] = useState(null); // { name, url, mimeType }
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Sync state (from SYNC socket events)
  const [syncPosition, setSyncPosition] = useState(null);
  const [syncPlaying, setSyncPlaying] = useState(null);

  const [hostDisconnected, setHostDisconnected] = useState(false);
  // Host refresh grace period
  const [hostReconnecting, setHostReconnecting] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState(10);
  const countdownRef = useRef(null);

  // Participant: video receiving state
  const [receiving, setReceiving] = useState(false);
  const [receiveProgress, setReceiveProgress] = useState(0);

  // Host: restoring from IndexedDB after refresh
  const [restoring, setRestoring] = useState(false);

  // Throttle time saves to IndexedDB (every 5s)
  const lastSaveTimeRef = useRef(0);

  // Accumulate incoming chunks: chunkIndex → ArrayBuffer
  const chunksRef = useRef({});
  const totalChunksRef = useRef(0);
  const receivedCountRef = useRef(0);

  // ── Assemble received chunks into a Blob URL ───────────────
  const assembleMedia = useCallback(({ fileName, mimeType }) => {
    const chunks = chunksRef.current;
    const total = totalChunksRef.current;
    const ordered = [];
    for (let i = 0; i < total; i++) {
      if (chunks[i]) ordered.push(chunks[i]);
    }
    const blob = new Blob(ordered, { type: mimeType });
    const url = URL.createObjectURL(blob);

    // Clean up previous blob
    setMedia((prev) => {
      if (prev?.url?.startsWith('blob:')) URL.revokeObjectURL(prev.url);
      return { name: fileName, url, mimeType };
    });

    // Reset chunk state
    chunksRef.current = {};
    totalChunksRef.current = 0;
    receivedCountRef.current = 0;
    setReceiving(false);
    setReceiveProgress(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setSyncPosition(0);
    setSyncPlaying(false);
  }, []);

  // ── Socket setup ───────────────────────────────────────────
  useEffect(() => {
    const cleanup = [];

    const init = async () => {
      setConnectionStatus('connecting');

      // ── Host: restore video from IndexedDB after a page refresh ──
      if (isHost) {
        setRestoring(true);
        try {
          const saved = await loadMediaFile(roomId);
          if (saved?.file) {
            const url = URL.createObjectURL(saved.file);
            setMedia({ name: saved.name, url, mimeType: saved.mimeType });
            // Restore playback position
            if (saved.currentTime > 0) {
              setSyncPosition(saved.currentTime);
              setCurrentTime(saved.currentTime);
            }
            // Register file with socket service so resends work
            socketService.restoreFile(saved.file);
          }
        } catch (e) {
          console.warn('[Room] Failed to restore media from IndexedDB', e);
        } finally {
          setRestoring(false);
        }
      }

      try {
        await socketService.connect();
      } catch {
        setConnectionStatus('disconnected');
        return;
      }

      setConnectionStatus('connected');

      // ── ROOM_STATE ─────────────────────────────────────────
      const unsubState = socketService.on('ROOM_STATE', (state) => {
        setParticipants(state.participants ?? 0);
        setHostReconnecting(false); // Host is back / we just joined
        clearInterval(countdownRef.current);
        if (state.media && !isHost) {
          setReceiving(true);
        }
        if (state.playback) {
          setSyncPosition(state.playback.position);
          setSyncPlaying(state.playback.playing);
          setIsPlaying(state.playback.playing);
        }
      });

      // ── PARTICIPANT_JOINED / LEFT ───────────────────────────
      const unsubJoined = socketService.on('PARTICIPANT_JOINED', ({ count }) => {
        setParticipants(count);
      });
      const unsubLeft = socketService.on('PARTICIPANT_LEFT', ({ count }) => {
        setParticipants(count);
      });

      // ── SYNC ── participant view receives play/pause/seek ───
      const unsubSync = socketService.on('SYNC', ({ position, playing }) => {
        if (!isHost) {
          setSyncPosition(position);
          setSyncPlaying(playing);
          setIsPlaying(playing);
        }
      });

      // ── HOST_RECONNECTING — host refreshed, grace period started ──
      const unsubHostRC = socketService.on('HOST_RECONNECTING', ({ graceMs }) => {
        setHostReconnecting(true);
        setReconnectCountdown(Math.round(graceMs / 1000));
        clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
          setReconnectCountdown((c) => {
            if (c <= 1) { clearInterval(countdownRef.current); return 0; }
            return c - 1;
          });
        }, 1000);
      });

      // ── HOST_RECONNECTED — host came back within grace period ──
      const unsubHostBack = socketService.on('HOST_RECONNECTED', () => {
        setHostReconnecting(false);
        clearInterval(countdownRef.current);
      });

      // ── HOST_DISCONNECTED ──────────────────────────────────
      const unsubHostDC = socketService.on('HOST_DISCONNECTED', () => {
        clearInterval(countdownRef.current);
        setHostReconnecting(false);
        setHostDisconnected(true);
        setConnectionStatus('disconnected');
      });

      // ── Auto-rejoin when socket reconnects (host page refresh) ──
      const unsubReconnect = socketService.on('connect', () => {
        setConnectionStatus('connected');
        socketService.emit('JOIN_ROOM', { roomId, isHost });
      });

      // ── MEDIA_CHUNK ── participant accumulates video chunks ─
      const unsubChunk = socketService.on(
        'MEDIA_CHUNK',
        ({ chunk, chunkIndex, totalChunks, mimeType, fileName }) => {
          if (!receiving && receivedCountRef.current === 0) {
            setReceiving(true);
          }
          totalChunksRef.current = totalChunks;
          chunksRef.current[chunkIndex] = chunk;
          receivedCountRef.current += 1;
          const pct = Math.round((receivedCountRef.current / totalChunks) * 100);
          setReceiveProgress(pct);
        }
      );

      // ── MEDIA_READY ── all chunks received, assemble blob ──
      const unsubReady = socketService.on('MEDIA_READY', ({ fileName, mimeType }) => {
        assembleMedia({ fileName, mimeType });
      });

      cleanup.push(
        unsubState, unsubJoined, unsubLeft, unsubSync,
        unsubHostDC, unsubHostRC, unsubHostBack, unsubReconnect, unsubChunk, unsubReady
      );

      // Join the room
      socketService.emit('JOIN_ROOM', { roomId, isHost });
    };

    init();

    return () => {
      cleanup.forEach((fn) => fn?.());
      clearInterval(countdownRef.current);
      socketService.emit('LEAVE_ROOM', { roomId });
      socketService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isHost]);

  // ── Host handlers ──────────────────────────────────────────

  const handlePlay = (position) => {
    setIsPlaying(true);
    playerRef.current?.play();
    socketService.emit('PLAY', { position, timestamp: Date.now() });
  };

  const handlePause = (position) => {
    setIsPlaying(false);
    playerRef.current?.pause();
    socketService.emit('PAUSE', { position });
  };

  const handleSeek = (position) => {
    playerRef.current?.seek(position);
    setCurrentTime(position);
    socketService.emit('SEEK', { position, playing: isPlaying });
  };

  const handleMediaSelect = ({ name, url, mimeType, file }) => {
    // Revoke old blob
    if (media?.url?.startsWith('blob:')) URL.revokeObjectURL(media.url);
    setMedia({ name, url, mimeType });
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSyncPosition(0);
    // Persist to IndexedDB so a page refresh restores the file
    if (file) saveMediaFile(roomId, file, 0);
    // Send file chunks to all participants via server
    socketService.emit('MEDIA_SELECTED', { name, url, mimeType, file });
  };

  const handleLeave = () => {
    // Clear persisted media when host deliberately leaves (not a refresh)
    if (isHost) clearMediaFile(roomId);
    navigate('/');
  };

  // ── Player event callbacks (host emits, participant ignores) ─

  const onPlayerPlay = (pos) => {
    setIsPlaying(true);
    if (isHost) socketService.emit('PLAY', { position: pos, timestamp: Date.now() });
  };

  const onPlayerPause = (pos) => {
    setIsPlaying(false);
    if (isHost) socketService.emit('PAUSE', { position: pos });
  };

  const onPlayerSeek = (pos) => {
    setCurrentTime(pos);
    if (isHost) socketService.emit('SEEK', { position: pos, playing: isPlaying });
  };

  // Throttled time-update: save to IndexedDB every 5s so refresh restores position
  const onTimeUpdate = (time) => {
    setCurrentTime(time);
    if (isHost && time - lastSaveTimeRef.current >= 5) {
      lastSaveTimeRef.current = time;
      updateSavedTime(roomId, time);
    }
  };

  // ── Host disconnected screen ───────────────────────────────
  if (hostDisconnected && !isHost) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '24px',
          textAlign: 'center',
          padding: '100px 24px',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
          }}
        >
          <LogOut size={34} color="#f87171" />
        </div>
        <div>
          <h2 className="heading-md" style={{ marginBottom: '12px' }}>Host Disconnected</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '360px', lineHeight: 1.7 }}>
            The host has left the room. The session has ended.
          </p>
        </div>
        <Link to="/" className="btn btn-primary">Return Home</Link>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        paddingTop: '80px',
        position: 'relative',
      }}
    >
      {/* Background gradient */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: isHost
            ? 'radial-gradient(ellipse 60% 40% at 30% 20%, rgba(59,130,246,0.07) 0%, transparent 60%)'
            : 'radial-gradient(ellipse 60% 40% at 70% 20%, rgba(139,92,246,0.07) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="pt-container" style={{ position: 'relative', zIndex: 1, paddingTop: '40px', paddingBottom: '64px' }}>

        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span className={`badge ${isHost ? 'badge-purple' : 'badge-blue'}`}>
                {isHost ? <Crown size={10} /> : <UserCircle size={10} />}
                {isHost ? 'Host' : 'Participant'}
              </span>
              <ConnectionStatus status={connectionStatus} />
            </div>
            <h1 className="heading-md" style={{ margin: 0 }}>
              Room{' '}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-blue-bright)',
                  letterSpacing: '2px',
                }}
              >
                {roomId}
              </span>
            </h1>
          </div>

          <button
            onClick={handleLeave}
            className="btn btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}
            id="leave-room-btn"
            aria-label="Leave the room"
          >
            <LogOut size={16} />
            Leave Room
          </button>
        </header>

        {/* Main grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isHost ? 'minmax(280px, 320px) 1fr' : '1fr',
            gap: '24px',
            alignItems: 'start',
          }}
          className="room-grid"
        >
          {/* ── Host sidebar ── */}
          {isHost && (
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <RoomInfo
                roomId={roomId}
                participants={participants}
                isHost={isHost}
                connectionStatus={connectionStatus}
              />

              <div className="card card-elevated">
                <p className="label" style={{ marginBottom: '16px' }}>Host Controls</p>
                <HostControls
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={duration}
                  onPlay={() => handlePlay(currentTime)}
                  onPause={() => handlePause(currentTime)}
                  onSeek={handleSeek}
                  onMediaSelect={handleMediaSelect}
                  mediaName={media?.name}
                />
              </div>
            </aside>
          )}

          {/* ── Media column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Participant compact room info */}
            {!isHost && (
              <div
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '16px 20px',
                }}
              >
                <RoomInfo
                  roomId={roomId}
                  participants={participants}
                  isHost={false}
                  compact={true}
                />
              </div>
            )}

            {/* ── Participant: host reconnecting banner ── */}
            {!isHost && hostReconnecting && (
              <div
                className="card"
                style={{
                  padding: '14px 20px',
                  background: 'rgba(245,158,11,0.08)',
                  borderColor: 'rgba(245,158,11,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
                aria-live="polite"
              >
                <WifiOff size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 500 }}>
                    Host is reconnecting…
                  </span>
                  <div style={{ height: '3px', background: 'rgba(245,158,11,0.15)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(reconnectCountdown / 10) * 100}%`,
                        background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                        borderRadius: '2px',
                        transition: 'width 900ms linear',
                      }}
                    />
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: '#f59e0b', fontFamily: 'var(--font-mono)', fontWeight: 600, flexShrink: 0 }}>
                  {reconnectCountdown}s
                </span>
              </div>
            )}

            {/* ── Participant: video receiving progress ── */}
            {!isHost && receiving && (
              <div
                className="card"
                style={{
                  padding: '20px 24px',
                  background: 'rgba(59,130,246,0.06)',
                  borderColor: 'rgba(59,130,246,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
                aria-live="polite"
                aria-label={`Receiving video: ${receiveProgress}%`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Loader2
                    size={16}
                    color="var(--accent-blue-bright)"
                    style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <Download size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                        Receiving video from host…
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--accent-blue-bright)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {receiveProgress}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${receiveProgress}%`,
                          background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))',
                          borderRadius: '2px',
                          transition: 'width 200ms ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Media Player */}
            <MediaPlayer
              ref={playerRef}
              src={media?.url}
              mediaName={media?.name}
              mediaType={media?.mimeType || 'video/mp4'}
              isReadOnly={!isHost}
              onPlay={onPlayerPlay}
              onPause={onPlayerPause}
              onSeek={onPlayerSeek}
              onTimeUpdate={onTimeUpdate}
              onDurationChange={setDuration}
              syncPosition={syncPosition}
              syncPlaying={!isHost ? syncPlaying : null}
            />

            {/* Sync status for participants */}
            {!isHost && media && !receiving && (
              <div
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 20px',
                  background: isPlaying ? 'rgba(6,182,212,0.06)' : 'var(--bg-card)',
                  borderColor: isPlaying ? 'rgba(6,182,212,0.2)' : 'var(--border-subtle)',
                  transition: 'all 400ms ease',
                }}
                aria-live="polite"
                aria-label={`Playback status: ${isPlaying ? 'playing' : 'paused'}`}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isPlaying ? 'var(--accent-cyan)' : 'var(--text-faint)',
                    boxShadow: isPlaying ? '0 0 8px var(--accent-cyan)' : 'none',
                    animation: isPlaying ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {isPlaying ? 'Synchronized — playing with host' : 'Waiting for host to play…'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .room-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
