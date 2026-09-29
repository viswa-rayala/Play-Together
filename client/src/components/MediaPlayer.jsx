import { forwardRef, useRef, useEffect, useState, useImperativeHandle } from 'react'
import { getServerTime } from '../services/mediaSocket'
import '../styles/MediaPlayer.css'

const VIDEO_EXTS = ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi', 'm4v']
function getExt(name = '') {
  return name.split('.').pop().toLowerCase()
}

/**
 * MediaPlayer — reusable media player component.
 * Supports both <video> and <audio> files, playlist navigation, and co-host control.
 *
 * Props:
 *   src          {string}   blob URL or HTTP URL of the media
 *   mediaName    {string}   filename (used to detect video vs audio)
 *   isHost       {boolean}  true → host view
 *   hasControl   {boolean}  true → host or co-host (can scrub, play/pause, change tracks)
 *   playlist     {Array}    queue of songs/videos
 *   playing      {boolean}  controlled play/pause state
 *   seekPosition {number}   controlled seek position in seconds
 *   onPlay       {(pos: number) => void}
 *   onPause      {(pos: number) => void}
 *   onSeek       {(pos: number) => void}
 *   onSync       {(pos: number, playing: boolean) => void}
 *   onNextTrack  {() => void}
 *   onPrevTrack  {() => void}
 */
const MediaPlayer = forwardRef(function MediaPlayer(
  {
    src,
    mediaName,
    isHost,
    hasControl,
    playlist = [],
    playing,
    seekPosition,
    scheduledPlay = null,
    defaultExpanded = false,
    onPlay,
    onPause,
    onSeek,
    onSync,
    onNextTrack,
    onPrevTrack,
  },
  ref
) {
  const mediaRef    = useRef(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [isVideo,     setIsVideo]     = useState(true)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [accentColor, setAccentColor] = useState('#6366f1')
  const [showFullName, setShowFullName] = useState(false)
  const prevPlayingRef  = useRef(playing)
  const prevSeekRef     = useRef(seekPosition)
  const playerShellRef  = useRef(null)
  const scheduledTimerRef = useRef(null)

  const userCanControl = Boolean(isHost || hasControl)

  // Expose helpers to parent via ref
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => mediaRef.current?.currentTime ?? 0,
    getDuration:    () => mediaRef.current?.duration    ?? 0,
  }))

  // Detect media type when filename changes; honour defaultExpanded for videos
  useEffect(() => {
    const isVid = VIDEO_EXTS.includes(getExt(mediaName))
    setIsVideo(isVid)
    if (defaultExpanded) setIsExpanded(true)
  }, [mediaName, defaultExpanded])

  // Scheduled future playback execution (Beatsync-style synchronized start)
  useEffect(() => {
    if (!scheduledPlay) return
    const el = mediaRef.current
    if (!el) return

    if (scheduledTimerRef.current) {
      clearTimeout(scheduledTimerRef.current)
      scheduledTimerRef.current = null
    }

    const { position, scheduledAt } = scheduledPlay
    const now = getServerTime()
    const delayMs = scheduledAt - now

    // Pre-cue target position so decoder buffer is ready immediately
    if (Math.abs(el.currentTime - position) > 0.04) {
      el.currentTime = position
    }

    if (delayMs > 0) {
      scheduledTimerRef.current = setTimeout(() => {
        const currentNow = getServerTime()
        const driftSec = (currentNow - scheduledAt) / 1000
        if (Math.abs(driftSec) > 0.06) {
          el.currentTime = position + Math.max(0, driftSec)
        }
        el.play()
          .then(() => setAutoplayBlocked(false))
          .catch(() => setAutoplayBlocked(true))
        scheduledTimerRef.current = null
      }, delayMs)
    } else {
      const elapsed = Math.max(0, (now - scheduledAt) / 1000)
      el.currentTime = position + elapsed
      el.play()
        .then(() => setAutoplayBlocked(false))
        .catch(() => setAutoplayBlocked(true))
    }

    return () => {
      if (scheduledTimerRef.current) {
        clearTimeout(scheduledTimerRef.current)
        scheduledTimerRef.current = null
      }
    }
  }, [scheduledPlay])

  // Sync play/pause state from parent
  useEffect(() => {
    if (prevPlayingRef.current === playing) return
    prevPlayingRef.current = playing
    const el = mediaRef.current
    if (!el) return
    if (playing) {
      // If a future scheduled play is pending, let scheduledTimer execute the start
      const isWaitingSchedule = scheduledPlay && (scheduledPlay.scheduledAt > getServerTime())
      if (!isWaitingSchedule) {
        el.play()
          .then(() => setAutoplayBlocked(false))
          .catch(() => setAutoplayBlocked(true))
      }
    } else {
      if (scheduledTimerRef.current) {
        clearTimeout(scheduledTimerRef.current)
        scheduledTimerRef.current = null
      }
      el.pause()
      el.playbackRate = 1.0 // Reset rate on pause
    }
  }, [playing, scheduledPlay])

  useEffect(() => {
    setAutoplayBlocked(false)
  }, [src])

  // Periodic sync emission for host/controllers
  useEffect(() => {
    if (!userCanControl || !playing) return
    const interval = setInterval(() => {
      const el = mediaRef.current
      if (el && !el.paused) {
        onSync?.(el.currentTime, true)
      }
    }, 800)
    return () => clearInterval(interval)
  }, [userCanControl, playing, onSync])

  // Sync seek position and soft-drift correction for non-controllers
  useEffect(() => {
    if (prevSeekRef.current === seekPosition) return
    prevSeekRef.current = seekPosition
    const el = mediaRef.current
    if (!el || userCanControl) return
    
    // Enable pitch preservation for seamless micro-adjustments
    el.preservesPitch = true
    if ('mozPreservesPitch' in el) el.mozPreservesPitch = true
    if ('webkitPreservesPitch' in el) el.webkitPreservesPitch = true

    const diff = seekPosition - el.currentTime
    
    if (playing) {
      if (Math.abs(diff) > 1.2) {
        // Hard seek if significantly out of sync (e.g. host seek or network stall)
        el.currentTime = seekPosition
        el.playbackRate = 1.0
      } else if (Math.abs(diff) <= 0.03) {
        // Beatsync-style deadband: within ±30ms is considered in sync (no speed oscillation)
        el.playbackRate = 1.0
      } else {
        // Proportional speed adjustment (clamped between 0.96x and 1.04x)
        const adjustment = Math.min(Math.max(diff * 0.25, -0.04), 0.04)
        el.playbackRate = 1.0 + adjustment
      }
    } else {
      // If paused, hard seek immediately if out of sync
      if (Math.abs(diff) > 0.05) {
        el.currentTime = seekPosition
      }
      el.playbackRate = 1.0
    }
  }, [seekPosition, playing, userCanControl])

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleTimeUpdate = () => {
    const el = mediaRef.current
    if (el) setCurrentTime(el.currentTime)
  }

  const handleLoadedMetadata = () => {
    const el = mediaRef.current
    if (el) setDuration(el.duration)
  }

  const handleMediaEnded = () => {
    if (userCanControl && playlist.length > 1) {
      onNextTrack?.()
    }
  }

  const handlePlayClick = () => {
    const el = mediaRef.current
    if (!el || !userCanControl) return
    onPlay?.(el.currentTime)
  }

  const handlePauseClick = () => {
    const el = mediaRef.current
    if (!el || !userCanControl) return
    if (scheduledTimerRef.current) {
      clearTimeout(scheduledTimerRef.current)
      scheduledTimerRef.current = null
    }
    el.pause()
    onPause?.(el.currentTime)
  }

  const handleSeekChange = (e) => {
    if (!userCanControl) return
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
    onEnded:            handleMediaEnded,
    className:          'mp-media-el',
    preload:            'metadata',
  }

  return (
    <div
      className={`media-player ${isExpanded ? 'is-expanded' : 'is-bottom-tab'}`}
      ref={playerShellRef}
      style={{ '--player-accent': accentColor }}
    >
      {/* ── Left / Media area ── */}
      <div className="mp-media-area">
        {isVideo ? (
          <div className="mp-video-shell" onClick={() => !isExpanded && setIsExpanded(true)}>
            <video {...sharedMediaProps} />

            <button
              type="button"
              className="mp-fullscreen-btn"
              onClick={(e) => {
                e.stopPropagation()
                toggleFullscreen()
              }}
              aria-label="Toggle fullscreen"
              title="Fullscreen"
            >
              ⤢
            </button>

            {!isExpanded && (
              <div className="mp-thumb-hover-hint" title="Click to expand video">
                <span>⤢</span>
              </div>
            )}
          </div>
        ) : (
          <div className="mp-audio-wrapper">
            <div className="mp-audio-card">
              <div className={`mp-audio-art ${playing ? 'playing' : ''}`}>🎵</div>
              <div className="mp-audio-info">
                <span className="mp-audio-label">Now Playing</span>
                <strong title={mediaName}>{mediaName || 'Untitled song'}</strong>
              </div>
            </div>
            <audio {...sharedMediaProps} />
          </div>
        )}

        <div className="mp-media-info-pill">
          <span
            className={`mp-media-name-txt ${showFullName ? 'show-full' : ''}`}
            title={mediaName}
            onClick={() => setShowFullName((prev) => !prev)}
          >
            {mediaName || 'Untitled'}
          </span>
          <span className={`mp-media-live-tag ${playing ? 'live' : 'paused'}`}>
            {playing ? '▶ Playing' : '⏸ Paused'}
          </span>
        </div>
      </div>

      {/* ── Center Controls area ── */}
      <div className="mp-controls">
        {/* Playback action buttons for Host & Co-Hosts */}
        {userCanControl && !isFullscreen ? (
          <div className="mp-btn-row">
            {playlist.length > 1 && (
              <button
                type="button"
                className="mp-skip-btn"
                onClick={onPrevTrack}
                title="Previous Track"
                aria-label="Previous Track"
              >
                ⏮
              </button>
            )}

            {playing ? (
              <button id="btn-pause" className="mp-playpause" onClick={handlePauseClick}>
                ⏸ Pause
              </button>
            ) : (
              <button id="btn-play" className="mp-playpause" onClick={handlePlayClick}>
                ▶ Play
              </button>
            )}

            {playlist.length > 1 && (
              <button
                type="button"
                className="mp-skip-btn"
                onClick={onNextTrack}
                title="Next Track"
                aria-label="Next Track"
              >
                ⏭
              </button>
            )}
          </div>
        ) : (
          /* Participant read-only hint */
          !userCanControl && (
            <div className="mp-participant-hint">
              👁 Viewer view — playback controlled by host & co-hosts
              {autoplayBlocked && (
                <button className="btn btn-primary mp-autoplay-btn" onClick={handleParticipantStart}>
                  ▶ Start playback
                </button>
              )}
            </div>
          )
        )}

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
            disabled={!userCanControl}
            aria-label="Seek"
          />
          <span className="mp-time">{fmt(duration)}</span>
        </div>
      </div>

      {/* ── Right Action Tools ── */}
      <div className="mp-tools-row">
        <label className="mp-color-picker" title="Accent color">
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            aria-label="Choose player accent color"
          />
        </label>

        <button
          type="button"
          className="mp-expand-btn"
          onClick={() => setIsExpanded((prev) => !prev)}
          title={isExpanded ? 'Minimize to bottom tab' : 'Expand player'}
          aria-label={isExpanded ? 'Minimize to bottom tab' : 'Expand player'}
        >
          {isExpanded ? '− Tab' : '⤢ Expand'}
        </button>
      </div>
    </div>
  )
})

export default MediaPlayer