import { forwardRef, useRef, useEffect, useState, useImperativeHandle } from 'react'
import '../styles/MediaPlayer.css'

const VIDEO_EXTS = ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi', 'm4v']
function getExt(name = '') {
  return name.split('.').pop().toLowerCase()
}

/**
 * MediaPlayer — reusable media player component.
 * Supports both <video> and <audio> files.
 * Contains NO WebSocket or socket logic.
 *
 * Props:
 *   src          {string}   blob URL or HTTP URL of the media
 *   mediaName    {string}   filename (used to detect video vs audio)
 *   isHost       {boolean}  true → show controls; false → read-only
 *   playing      {boolean}  controlled play/pause state (from parent)
 *   seekPosition {number}   controlled seek position in seconds (from parent)
 *   onPlay       {(pos: number) => void}
 *   onPause      {(pos: number) => void}
 *   onSeek       {(pos: number) => void}
 *
 * Ref: exposes { getCurrentTime, getDuration } for parent use
 */
const MediaPlayer = forwardRef(function MediaPlayer(
  { src, mediaName, isHost, playing, seekPosition, onPlay, onPause, onSeek },
  ref
) {
  const mediaRef    = useRef(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [isVideo,     setIsVideo]     = useState(true)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [accentColor, setAccentColor] = useState('#6366f1')
  const prevPlayingRef  = useRef(playing)
  const prevSeekRef     = useRef(seekPosition)
  const playerShellRef  = useRef(null)

  // Expose helpers to parent via ref
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => mediaRef.current?.currentTime ?? 0,
    getDuration:    () => mediaRef.current?.duration    ?? 0,
  }))

  // Detect media type when filename changes
  useEffect(() => {
    setIsVideo(VIDEO_EXTS.includes(getExt(mediaName)))
  }, [mediaName])

  // Sync play/pause state from parent (participant view or after host emits)
  useEffect(() => {
    if (prevPlayingRef.current === playing) return
    prevPlayingRef.current = playing
    const el = mediaRef.current
    if (!el) return
    if (playing) {
      el.play()
        .then(() => setAutoplayBlocked(false))
        .catch(() => setAutoplayBlocked(true))
    } else {
      el.pause()
    }
  }, [playing])

  useEffect(() => {
    setAutoplayBlocked(false)
  }, [src])

  // Sync seek position from parent (participant view)
  useEffect(() => {
    if (prevSeekRef.current === seekPosition) return
    prevSeekRef.current = seekPosition
    const el = mediaRef.current
    if (!el) return
    if (Math.abs(el.currentTime - seekPosition) > 0.5) {
      el.currentTime = seekPosition
    }
  }, [seekPosition])

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleTimeUpdate = () => {
    const el = mediaRef.current
    if (el) setCurrentTime(el.currentTime)
  }

  const handleLoadedMetadata = () => {
    const el = mediaRef.current
    if (el) setDuration(el.duration)
  }

  const handlePlayClick = () => {
    const el = mediaRef.current
    if (!el || !isHost) return
    el.play().catch(() => {})
    onPlay?.(el.currentTime)
  }

  const handlePauseClick = () => {
    const el = mediaRef.current
    if (!el || !isHost) return
    el.pause()
    onPause?.(el.currentTime)
  }

  const handleSeekChange = (e) => {
    if (!isHost) return
    const pos = parseFloat(e.target.value)
    const el  = mediaRef.current
    if (el) el.currentTime = pos
    setCurrentTime(pos)
    onSeek?.(pos)
  }

  const handleParticipantStart = () => {
    mediaRef.current?.play()
      .then(() => setAutoplayBlocked(false))
      .catch(() => setAutoplayBlocked(true))
  }

  const toggleFullscreen = async () => {
    const target = playerShellRef.current
    if (!target) return

    try {
      if (!document.fullscreenElement) {
        await target.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch {
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const progressPct = duration ? (currentTime / duration) * 100 : 0

  const sharedMediaProps = {
    ref: mediaRef,
    src,
    onTimeUpdate:       handleTimeUpdate,
    onLoadedMetadata:   handleLoadedMetadata,
    className:          'mp-media-el',
    preload:            'metadata',
  }

  return (
    <div className="media-player" ref={playerShellRef} style={{ '--player-accent': accentColor }}>
      {isVideo ? (
        <div className="mp-video-shell">
          <video {...sharedMediaProps} />

          <button className="mp-fullscreen-btn" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
            {isFullscreen ? '⤢' : '⤢'}
          </button>
        </div>
      ) : (
        <div className="mp-audio-wrapper">
          <div className="mp-audio-card">
            <div className="mp-audio-art">🎵</div>
            <div className="mp-audio-info">
              <span className="mp-audio-label">Now Playing</span>
              <strong>{mediaName || 'Untitled song'}</strong>
            </div>
          </div>
          <audio {...sharedMediaProps} />
        </div>
      )}

      {/* ── Controls bar ── */}
      <div className="mp-controls">

        {/* Progress / seek bar */}
        <div className="mp-progress-row">
          <span className="mp-time">{fmt(currentTime)}</span>
          <input
            id="media-seek-bar"
            type="range"
            className="mp-seek"
            min={0}
            max={duration || 0}
            value={currentTime}
            step={0.1}
            style={{
              background: `linear-gradient(to right, var(--primary) ${progressPct}%, var(--surface-2) ${progressPct}%)`
            }}
            onChange={handleSeekChange}
            disabled={!isHost}
            aria-label="Seek"
          />
          <span className="mp-time">{fmt(duration)}</span>
        </div>

        <div className="mp-color-row">
          <label className="mp-color-picker">
            <span>Accent</span>
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              aria-label="Choose player accent color"
            />
          </label>
        </div>

        {/* Play / Pause button — host only */}
        {isHost && !isFullscreen && (
          <div className="mp-btn-row">
            {playing ? (
              <button id="btn-pause" className="mp-playpause" onClick={handlePauseClick}>
                ⏸ Pause
              </button>
            ) : (
              <button id="btn-play" className="mp-playpause" onClick={handlePlayClick}>
                ▶ Play
              </button>
            )}
          </div>
        )}

        {/* Participant read-only hint */}
        {!isHost && (
          <div className="mp-participant-hint">
            👁 Participant view — playback is controlled by the host
            {autoplayBlocked && (
              <button className="btn btn-primary" onClick={handleParticipantStart}>
                ▶ Start playback
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default MediaPlayer