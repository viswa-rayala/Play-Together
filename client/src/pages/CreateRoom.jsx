import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Users, Wifi, ArrowRight, Crown, RefreshCw } from 'lucide-react';
import RoomInfo from '../components/RoomInfo';
import ConnectionStatus from '../components/ConnectionStatus';
import MediaPlayer from '../components/MediaPlayer';
import HostControls from '../components/HostControls';
import socketService from '../services/socket';

export default function CreateRoom() {
  const navigate = useNavigate();
  const playerRef = useRef(null);

  const [roomId] = useState(() => socketService.constructor.generateRoomId());
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [participants, setParticipants] = useState(0);
  const [media, setMedia] = useState(null); // { name, url, mimeType }
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Connect and join room on mount
  useEffect(() => {
    let cleanup = [];

    const init = async () => {
      setConnectionStatus('connecting');

      // Connect mock socket
      await socketService.connect();
      setConnectionStatus('connected');

      // Listen for participant changes
      const unsubJoined = socketService.on('PARTICIPANT_JOINED', ({ count }) => {
        setParticipants(count);
      });
      const unsubLeft = socketService.on('PARTICIPANT_LEFT', ({ count }) => {
        setParticipants(count);
      });

      cleanup.push(unsubJoined, unsubLeft);

      // Join as host
      socketService.emit('JOIN_ROOM', { roomId, isHost: true });
    };

    init().catch(() => setConnectionStatus('disconnected'));

    return () => {
      cleanup.forEach((fn) => fn?.());
      socketService.emit('LEAVE_ROOM', { roomId });
      socketService.disconnect();
    };
  }, [roomId]);

  // ── Host control handlers (maps directly to backend events) ──

  const handlePlay = () => {
    // Drive the actual media element
    playerRef.current?.play();
    setIsPlaying(true);
    // Backend: socketService.emit('PLAY', { type: 'PLAY', position: playerRef.current?.getCurrentTime() ?? 0, timestamp: Date.now() });
  };

  const handlePause = () => {
    // Drive the actual media element
    playerRef.current?.pause();
    setIsPlaying(false);
    // Backend: socketService.emit('PAUSE', { type: 'PAUSE', position: playerRef.current?.getCurrentTime() ?? 0 });
  };

  const handleSeek = (position) => {
    playerRef.current?.seek(position);
    setCurrentTime(position);
    // Backend: socketService.emit('SEEK', { type: 'SEEK', position });
  };

  // Called when MediaPlayer's own controls are used (play/pause clicked inside player)
  const handlePlayerPlay = (pos) => {
    setIsPlaying(true);
    setCurrentTime(pos);
    // Backend: socketService.emit('PLAY', { type: 'PLAY', position: pos, timestamp: Date.now() });
  };

  const handlePlayerPause = (pos) => {
    setIsPlaying(false);
    setCurrentTime(pos);
    // Backend: socketService.emit('PAUSE', { type: 'PAUSE', position: pos });
  };

  const handleMediaSelect = ({ name, url, mimeType }) => {
    if (media?.url) URL.revokeObjectURL(media.url); // cleanup old blob
    setMedia({ name, url, mimeType });
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    // Backend: socketService.emit('MEDIA_SELECTED', { name, url });
  };

  const handleGoToRoom = () => {
    navigate(`/room/${roomId}?host=1`);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        paddingTop: '80px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: `
            radial-gradient(ellipse 70% 50% at 30% 20%, rgba(59,130,246,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 70% 80%, rgba(139,92,246,0.07) 0%, transparent 60%)
          `,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="pt-container" style={{ position: 'relative', zIndex: 1, paddingTop: '40px', paddingBottom: '64px' }}>

        {/* Page Header */}
        <header style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span className="badge badge-purple">
              <Crown size={10} />
              Host
            </span>
            <ConnectionStatus status={connectionStatus} />
          </div>
          <h1 className="heading-lg" style={{ marginBottom: '8px' }}>Create Room</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
            Select your media, share the Room ID, and control playback.
          </p>
        </header>

        {/* Main layout: sidebar + player */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(300px, 360px) 1fr',
            gap: '24px',
            alignItems: 'start',
          }}
          className="create-room-grid"
        >
          {/* ── Sidebar ── */}
          <aside
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            aria-label="Room controls sidebar"
          >
            {/* Room Info */}
            <RoomInfo
              roomId={roomId}
              participants={participants}
              isHost={true}
              connectionStatus={connectionStatus}
            />

            {/* Host Controls */}
            <div className="card card-elevated" aria-label="Playback controls">
              <p className="label" style={{ marginBottom: '16px' }}>Playback Controls</p>
              <HostControls
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onMediaSelect={handleMediaSelect}
                mediaName={media?.name}
              />
            </div>

            {/* Participant count */}
            <div
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={18} color="var(--accent-cyan)" />
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {participants === 0 ? 'No participants yet' : `${participants} participant${participants > 1 ? 's' : ''} connected`}
                </span>
              </div>
              {connectionStatus === 'connected' && participants === 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>Waiting…</span>
              )}
            </div>

            {/* Go to room button */}
            <button
              onClick={handleGoToRoom}
              className="btn btn-primary w-full"
              id="go-to-room-btn"
              aria-label="Go to the room view"
            >
              Go to Room
              <ArrowRight size={16} />
            </button>
          </aside>

          {/* ── Media Player ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <MediaPlayer
              ref={playerRef}
              src={media?.url}
              mediaName={media?.name}
              mediaType={media?.mimeType || 'video/mp4'}
              isReadOnly={false}
              onPlay={handlePlayerPlay}
              onPause={handlePlayerPause}
              onSeek={handleSeek}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
            />

            {/* Media hint */}
            {!media && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px',
                  background: 'var(--bg-card)',
                  border: '1px dashed var(--border-medium)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <Upload size={24} color="var(--text-faint)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  Select a video or audio file using the controls on the left.
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '6px' }}>
                  Supported: MP4, WebM, MOV, MP3, WAV, OGG, and more.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 900px) {
          .create-room-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
