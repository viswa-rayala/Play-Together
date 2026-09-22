import React, { useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, FolderOpen } from 'lucide-react';

/**
 * HostControls — Playback controls for the room host
 *
 * Backend integration point:
 *   - onPlay    → emit('PLAY',  { position, timestamp: Date.now() })
 *   - onPause   → emit('PAUSE', { position })
 *   - onSeek    → emit('SEEK',  { position })
 *   - onMedia   → emit('MEDIA_SELECTED', { name, url })
 *
 * These controls are ONLY rendered for the host (isHost = true).
 */
export default function HostControls({
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  onPlay,
  onPause,
  onSeek,
  onMediaSelect,
  mediaName = null,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    // Pass mimeType so consumers can correctly detect video vs audio
    // even when blob:// URLs have no file extension
    onMediaSelect?.({
      name: file.name,
      url,
      mimeType: file.type,   // e.g. 'video/mp4' or 'audio/mpeg'
      file,
    });

    // Reset input so same file can be reselected
    e.target.value = '';
  };

  const handleSeekInput = (e) => {
    const value = parseFloat(e.target.value);
    onSeek?.(value);
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
      aria-label="Host playback controls"
    >
      {/* Media Select */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="media-file-input"
          aria-label="Select media file"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-ghost w-full"
          style={{
            gap: '10px',
            border: '1px dashed var(--border-medium)',
            justifyContent: 'center',
          }}
          id="select-media-btn"
          aria-label="Select a video or audio file"
        >
          <FolderOpen size={18} color="var(--accent-blue)" />
          <span>
            {mediaName ? (
              <span style={{ color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                {mediaName}
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Select Video or Audio</span>
            )}
          </span>
        </button>
      </div>

      {/* Seek Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ position: 'relative', height: '6px' }}>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            step={0.1}
            onChange={handleSeekInput}
            disabled={!duration}
            aria-label="Seek playback position"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            style={{
              width: '100%',
              appearance: 'none',
              height: '6px',
              borderRadius: '3px',
              background: `linear-gradient(to right, var(--accent-blue) ${progressPercent}%, rgba(255,255,255,0.12) ${progressPercent}%)`,
              outline: 'none',
              cursor: duration ? 'pointer' : 'default',
              opacity: duration ? 1 : 0.4,
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Play / Pause */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <button
          onClick={() => onSeek?.(Math.max(0, currentTime - 10))}
          className="btn btn-ghost btn-icon"
          disabled={!duration}
          aria-label="Skip back 10 seconds"
          title="−10s"
        >
          <SkipBack size={18} />
        </button>

        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={!duration}
          className="btn btn-primary"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            padding: 0,
            fontSize: '20px',
            boxShadow: isPlaying ? '0 0 24px rgba(139,92,246,0.5)' : '0 0 24px rgba(59,130,246,0.4)',
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          id="host-play-pause-btn"
        >
          {isPlaying ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" style={{ marginLeft: '2px' }} />}
        </button>

        <button
          onClick={() => onSeek?.(Math.min(duration, currentTime + 10))}
          className="btn btn-ghost btn-icon"
          disabled={!duration}
          aria-label="Skip forward 10 seconds"
          title="+10s"
        >
          <SkipForward size={18} />
        </button>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--accent-blue-bright);
          cursor: pointer;
          box-shadow: 0 0 6px rgba(59,130,246,0.6);
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--accent-blue-bright);
          border: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
