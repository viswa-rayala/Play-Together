import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Music,
  Film,
} from 'lucide-react';

/**
 * MediaPlayer — Premium cinematic media player
 *
 * Supports: video, audio
 * Controls: play, pause, seek, volume, fullscreen (video)
 *
 * Backend sync hooks:
 *   onPlay(currentTime)   → emit PLAY
 *   onPause(currentTime)  → emit PAUSE
 *   onSeek(position)      → emit SEEK
 *   onTimeUpdate(time)    → use for SYNC polling
 *
 * External control via ref:
 *   playerRef.current.seek(position)
 *   playerRef.current.play()
 *   playerRef.current.pause()
 */
const MediaPlayer = forwardRef(function MediaPlayer(
  {
    src,
    mediaName,
    mediaType = 'video',
    isReadOnly = false,
    onPlay,
    onPause,
    onSeek,
    onTimeUpdate,
    onDurationChange,
    syncPosition = null,
    syncPlaying = null,
  },
  ref
) {
  const mediaRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const hideControlsTimer = useRef(null);

  // Reset player state whenever the source file changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (mediaRef.current) {
      mediaRef.current.pause();
      mediaRef.current.load(); // forces the browser to reload the new src
    }
  }, [src]);


  // Expose imperative controls for sync
  useImperativeHandle(ref, () => ({
    seek(position) {
      if (mediaRef.current) {
        mediaRef.current.currentTime = position;
        setCurrentTime(position);
      }
    },
    play() {
      mediaRef.current?.play();
    },
    pause() {
      mediaRef.current?.pause();
    },
    getCurrentTime() {
      return mediaRef.current?.currentTime ?? 0;
    },
  }));

  // Sync from backend (participant view)
  useEffect(() => {
    if (syncPosition === null || !mediaRef.current) return;
    const diff = Math.abs(mediaRef.current.currentTime - syncPosition);
    if (diff > 0.5) {
      mediaRef.current.currentTime = syncPosition;
      setCurrentTime(syncPosition);
    }
  }, [syncPosition]);

  useEffect(() => {
    if (syncPlaying === null || !mediaRef.current) return;
    if (syncPlaying && mediaRef.current.paused) {
      mediaRef.current.play().catch(() => {});
    } else if (!syncPlaying && !mediaRef.current.paused) {
      mediaRef.current.pause();
    }
  }, [syncPlaying]);

  // Auto-hide controls on video inactivity
  const scheduleHideControls = useCallback(() => {
    clearTimeout(hideControlsTimer.current);
    setShowControls(true);
    if (mediaType === 'video' && isPlaying) {
      hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [mediaType, isPlaying]);

  useEffect(() => {
    return () => clearTimeout(hideControlsTimer.current);
  }, []);

  const handlePlay = () => {
    setIsPlaying(true);
    onPlay?.(mediaRef.current?.currentTime ?? 0);
    scheduleHideControls();
  };

  const handlePause = () => {
    setIsPlaying(false);
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    onPause?.(mediaRef.current?.currentTime ?? 0);
  };

  const handleTimeUpdate = () => {
    if (!isDragging && mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
      onTimeUpdate?.(mediaRef.current.currentTime);
    }
  };

  const handleDurationChange = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
      onDurationChange?.(mediaRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const value = parseFloat(e.target.value);
    setCurrentTime(value);
    if (mediaRef.current) mediaRef.current.currentTime = value;
    onSeek?.(value);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (mediaRef.current) {
      mediaRef.current.volume = val;
      mediaRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!mediaRef.current) return;
    const muted = !isMuted;
    setIsMuted(muted);
    mediaRef.current.muted = muted;
  };

  const togglePlayPause = () => {
    if (!mediaRef.current || isReadOnly) return;
    if (isPlaying) {
      mediaRef.current.pause();
    } else {
      mediaRef.current.play().catch(() => {});
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Detect audio vs video from MIME type (blob URLs have no extension)
  // mediaType prop is now always the real file.type e.g. 'video/mp4' or 'audio/mpeg'
  const isAudio = mediaType
    ? mediaType.startsWith('audio/')
    : src
      ? /\.(mp3|wav|ogg|flac|aac|m4a|opus|weba)$/i.test(src)
      : false;

  if (!src) {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: isAudio ? 'auto' : '16/9',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          minHeight: isAudio ? '120px' : 'auto',
          padding: '40px',
        }}
        aria-label="No media loaded"
      >
        {isAudio ? (
          <Music size={40} color="var(--text-faint)" />
        ) : (
          <Film size={40} color="var(--text-faint)" />
        )}
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          {isReadOnly ? 'Waiting for host to select media…' : 'No media selected'}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: isAudio ? 'auto' : '16/9',
        background: '#000',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px var(--border-subtle)',
        cursor: mediaType === 'video' ? (showControls ? 'default' : 'none') : 'default',
      }}
      onMouseMove={scheduleHideControls}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => mediaType === 'video' && isPlaying && setShowControls(false)}
      aria-label={`Media player: ${mediaName || 'media'}`}
    >
      {/* Audio background */}
      {isAudio && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, var(--bg-card), var(--bg-elevated))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden="true"
        >
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 60px rgba(59,130,246,0.3)',
              animation: isPlaying ? 'pulse-glow 2s ease-in-out infinite' : 'none',
            }}
          >
            <Music size={48} color="white" />
          </div>
        </div>
      )}

      {/* Media element */}
      {isAudio ? (
        <audio
          ref={mediaRef}
          src={src}
          onPlay={handlePlay}
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={handleDurationChange}
          onLoadedMetadata={handleDurationChange}
          style={{ display: 'none' }}
          preload="metadata"
        />
      ) : (
        <video
          ref={mediaRef}
          src={src}
          onClick={isReadOnly ? undefined : togglePlayPause}
          onPlay={handlePlay}
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={handleDurationChange}
          onLoadedMetadata={handleDurationChange}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          preload="metadata"
        />
      )}

      {/* Controls overlay */}
      <div
        style={{
          position: isAudio ? 'relative' : 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: isAudio ? '20px' : '20px',
          paddingTop: isAudio ? '0' : '40px',
          background: isAudio
            ? 'transparent'
            : 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
          opacity: isAudio ? 1 : (showControls ? 1 : 0),
          transition: 'opacity 300ms ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 10,
          marginTop: isAudio ? '100px' : 0,
        }}
        aria-label="Player controls"
      >
        {/* Media name */}
        {mediaName && (
          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '0.2px',
          }}>
            {mediaName}
          </p>
        )}

        {/* Seek bar */}
        <div style={{ position: 'relative', height: '4px', cursor: 'pointer' }}>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            step={0.1}
            onChange={handleSeek}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            disabled={isReadOnly || !duration}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            style={{
              width: '100%',
              appearance: 'none',
              height: '4px',
              borderRadius: '2px',
              background: `linear-gradient(to right, var(--accent-blue) ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
              outline: 'none',
              cursor: isReadOnly || !duration ? 'default' : 'pointer',
              opacity: !duration ? 0.5 : 1,
            }}
          />
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Play/Pause */}
          {!isReadOnly && (
            <button
              onClick={togglePlayPause}
              disabled={!duration}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: duration ? 'pointer' : 'default',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                opacity: duration ? 1 : 0.4,
                transition: 'transform 150ms ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              id="media-player-play-btn"
            >
              {isPlaying
                ? <Pause size={22} fill="white" />
                : <Play size={22} fill="white" style={{ marginLeft: '2px' }} />
              }
            </button>
          )}

          {/* Readonly indicator */}
          {isReadOnly && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isPlaying
                ? <Pause size={18} color="rgba(255,255,255,0.5)" />
                : <Play size={18} color="rgba(255,255,255,0.5)" />
              }
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>
                HOST CONTROLS
              </span>
            </div>
          )}

          {/* Time */}
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.8)',
            letterSpacing: '0.5px',
            flexShrink: 0,
          }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div style={{ flex: 1 }} />

          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={toggleMute}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex' }}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label="Volume"
              style={{
                width: '70px',
                appearance: 'none',
                height: '3px',
                borderRadius: '2px',
                background: `linear-gradient(to right, rgba(255,255,255,0.8) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%)`,
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Fullscreen (video only) */}
          {!isAudio && (
            <button
              onClick={toggleFullscreen}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex' }}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <Maximize size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default MediaPlayer;
