import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import mediaSocket from '../services/mediaSocket'
import MediaPlayer     from '../components/MediaPlayer'
import RoomInfo        from '../components/RoomInfo'
import AdminControls   from '../components/AdminControls'
import PassengerPanel  from '../components/PassengerPanel'
import ConnectionStatus from '../components/ConnectionStatus'
import ChatBox          from '../components/ChatBox'
import MeetBox          from '../components/MeetBox'
import '../styles/Room.css'

/**
 * Room — the main session page.
 *
 * URL: /room/:roomId?host=true   → host view (full controls)
 *      /room/:roomId?host=false  → participant view (read-only)
 *
 * All socket/network interaction is handled HERE, not inside child components.
 */
function Room() {
  const { roomId }       = useParams()
  const [searchParams]   = useSearchParams()
  const navigate         = useNavigate()
  const isHost           = searchParams.get('host') === 'true'
  const participantName  = searchParams.get('name') || 'Participant'

  // ── State ───────────────────────────────────────────────────────────────────
  const [connStatus,    setConnStatus]   = useState('connecting')
  const [participants,  setParticipants] = useState([])  // [{id, name}]
  const [media,         setMedia]        = useState(null)   // { name, url }
  const [playlist,      setPlaylist]     = useState([])     // [{ name, url }]
  const [controllers,   setControllers]  = useState([])     // [socketId]
  const [myId,          setMyId]         = useState('')
  const [hostId,        setHostId]       = useState('')
  const [uploadProgress, setUploadProgress] = useState(null)
  const [messages,       setMessages]       = useState([])
  const [playing,       setPlaying]      = useState(false)
  const [seekPosition,  setSeekPosition] = useState(0)
  const [showMeet,      setShowMeet]     = useState(false)

  const playerRef = useRef(null)

  // A user has control if they are the Room Host or have been granted Co-Host control
  const hasControl = isHost || (Boolean(myId) && controllers.includes(myId))

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Named handlers so we can remove them on cleanup
    const onConnStatus      = ({ status }) => setConnStatus(status)
    const onRoomState       = (s) => {
      setParticipants(s.participants || [])
      setMessages(s.messages || [])
      setMedia(s.media || null)
      setPlaylist(s.playlist || [])
      setControllers(s.controllers || [])
      if (s.myId) setMyId(s.myId)
      if (s.hostId) setHostId(s.hostId)
      setPlaying(s.playback.playing)
      if (s.playback.playing && s.serverTime) {
        const elapsed = Math.max(0, (mediaSocket.getServerTime() - s.serverTime) / 1000)
        setSeekPosition(s.playback.position + elapsed)
      } else {
        setSeekPosition(s.playback.position)
      }
    }
    const onParticipantJoined = (data) => {
      if (data?.participants) setParticipants(data.participants)
      if (data?.hostId) setHostId(data.hostId)
    }
    const onParticipantLeft   = (data) => {
      if (data?.participants) setParticipants(data.participants)
      if (data?.hostId) setHostId(data.hostId)
    }
    const onChatMessage = (message) => setMessages((current) => (
      current.some((item) => item.id === message.id)
        ? current
        : [...current, message].slice(-100)
    ))
    const onPlay    = ({ position, serverTime }) => {
      setPlaying(true)
      if (serverTime) {
        const elapsed = Math.max(0, (mediaSocket.getServerTime() - serverTime) / 1000)
        setSeekPosition(position + elapsed)
      } else {
        setSeekPosition(position)
      }
    }
    const onPause   = ({ position }) => { setPlaying(false); setSeekPosition(position) }
    const onSeek    = ({ position }) => setSeekPosition(position)
    const onSync    = ({ position, playing, serverTime }) => {
      setPlaying(playing)
      if (playing && serverTime) {
        const elapsed = Math.max(0, (mediaSocket.getServerTime() - serverTime) / 1000)
        setSeekPosition(position + elapsed)
      } else {
        setSeekPosition(position)
      }
    }
    const onMediaSelected = ({ media, playlist }) => {
      if (media !== undefined) setMedia(media)
      if (playlist) setPlaylist(playlist)
    }
    const onPlaylistUpdated = ({ playlist, media }) => {
      if (playlist) setPlaylist(playlist)
      if (media !== undefined) setMedia(media)
    }
    const onControllersUpdated = ({ controllers }) => {
      setControllers(controllers || [])
    }
    const onHostDisconnected = () => {
      mediaSocket.disconnect()
      navigate('/')
    }

    mediaSocket.on('CONNECTION_STATUS',  onConnStatus)
    mediaSocket.on('ROOM_STATE',         onRoomState)
    mediaSocket.on('PARTICIPANT_JOINED', onParticipantJoined)
    mediaSocket.on('PARTICIPANT_LEFT',   onParticipantLeft)
    mediaSocket.on('CHAT_MESSAGE',       onChatMessage)
    mediaSocket.on('PLAY',               onPlay)
    mediaSocket.on('PAUSE',              onPause)
    mediaSocket.on('SEEK',               onSeek)
    mediaSocket.on('SYNC',               onSync)
    mediaSocket.on('MEDIA_SELECTED',     onMediaSelected)
    mediaSocket.on('PLAYLIST_UPDATED',   onPlaylistUpdated)
    mediaSocket.on('CONTROLLERS_UPDATED', onControllersUpdated)
    mediaSocket.on('HOST_DISCONNECTED',  onHostDisconnected)

    // Connect to room
    mediaSocket.connect(roomId, isHost, participantName)

    // Cleanup on unmount
    return () => {
      mediaSocket.off('CONNECTION_STATUS',  onConnStatus)
      mediaSocket.off('ROOM_STATE',         onRoomState)
      mediaSocket.off('PARTICIPANT_JOINED', onParticipantJoined)
      mediaSocket.off('PARTICIPANT_LEFT',   onParticipantLeft)
      mediaSocket.off('CHAT_MESSAGE',       onChatMessage)
      mediaSocket.off('PLAY',               onPlay)
      mediaSocket.off('PAUSE',              onPause)
      mediaSocket.off('SEEK',               onSeek)
      mediaSocket.off('SYNC',               onSync)
      mediaSocket.off('MEDIA_SELECTED',     onMediaSelected)
      mediaSocket.off('PLAYLIST_UPDATED',   onPlaylistUpdated)
      mediaSocket.off('CONTROLLERS_UPDATED', onControllersUpdated)
      mediaSocket.off('HOST_DISCONNECTED',  onHostDisconnected)
      mediaSocket.disconnect()
    }
  }, [roomId, isHost, participantName, navigate])

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const handleFileSelect = async (files) => {
    try {
      setUploadProgress(0)
      const uploadedData = await mediaSocket.uploadMedia(files, (progress) => {
        setUploadProgress(progress)
      })
      const uploadedFiles = uploadedData.files || (uploadedData.name ? [{ name: uploadedData.name, url: uploadedData.url }] : [])
      const names = uploadedFiles.map((f) => f.name)
      
      const shouldSelectFirst = !media && names.length > 0
      mediaSocket.sendAddToPlaylist(names, shouldSelectFirst)
      setUploadProgress(null)
    } catch (error) {
      setUploadProgress(null)
      setConnStatus('error')
      console.error('Media upload failed:', error)
    }
  }

  const handleSelectPlaylistItem = (item) => {
    if (!hasControl) return
    const name = typeof item === 'string' ? item : item.name
    mediaSocket.sendMediaSelected(name)
  }

  const handleRemovePlaylistItem = (item) => {
    if (!hasControl) return
    const name = typeof item === 'string' ? item : item.name
    mediaSocket.sendRemoveFromPlaylist(name)
  }

  const handleToggleControl = (targetId) => {
    if (!isHost) return
    const isCurrentlyGranted = controllers.includes(targetId)
    mediaSocket.sendToggleControl(targetId, !isCurrentlyGranted)
  }

  const handleNextTrack = () => {
    if (!hasControl || playlist.length === 0) return
    const currentIndex = playlist.findIndex((p) => p.name === media?.name)
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % playlist.length : 0
    handleSelectPlaylistItem(playlist[nextIndex])
  }

  const handlePrevTrack = () => {
    if (!hasControl || playlist.length === 0) return
    const currentIndex = playlist.findIndex((p) => p.name === media?.name)
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1
    handleSelectPlaylistItem(playlist[prevIndex])
  }

  const handlePlay  = (pos) => { setPlaying(true);  setSeekPosition(pos); mediaSocket.sendPlay(pos) }
  const handlePause = (pos) => { setPlaying(false); setSeekPosition(pos); mediaSocket.sendPause(pos) }
  const handleSeek  = (pos) => { setSeekPosition(pos); mediaSocket.sendSeek(pos) }
  const handleSync  = (pos, isPlaying) => { mediaSocket.sendSync(pos, isPlaying) }
  const handleChatSend = (message) => {
    const clientMessageId = `${participantName}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const chatMessage = { id: clientMessageId, name: participantName, message }
    setMessages((current) => [...current, chatMessage].slice(-100))
    mediaSocket.sendChatMessage(message, clientMessageId)
  }

  const handleRemoveParticipant = () => {
    // Participant management is owned by the realtime server.
  }

  const handleLeaveRoom = () => {
    mediaSocket.leaveRoom()
    navigate('/')
  }

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId).catch(() => {})
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="room-wrap">

      {/* ── Top header ── */}
      <header className="room-header">
        <span className="room-logo">▶ Play Together</span>
        <div className="room-header-right">
          {/* WhatsApp style video camera icon button right before connection status */}
          <button
            id="btn-toggle-meet"
            className={`room-cam-btn ${showMeet ? 'active' : ''}`}
            onClick={() => setShowMeet((prev) => !prev)}
            title={showMeet ? 'Close Video Call' : 'Start Video Call'}
            aria-label="Toggle Video Call"
          >
            <svg
              className="cam-whatsapp-icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M16 7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h11c.55 0 1-.45 1-1v-3.5l4 3.5c.37.33.95.07.95-.42V7.42c0-.49-.58-.75-.95-.42L16 10.5V7z" />
            </svg>
          </button>

          <ConnectionStatus status={connStatus} />

          {/* Host Leave button — only visible in host header */}
          {isHost && (
            <button
              id="btn-leave-room"
              className="btn btn-danger"
              onClick={handleLeaveRoom}
            >
              Leave
            </button>
          )}
        </div>
      </header>

      {/* ── Main layout (sidebar + player) ── */}
      <div className="room-main">

        {/* ── Sidebar ── */}
        <aside className="room-sidebar">

          {/* Admin Panel — host only */}
          {isHost && (
            <>
              <RoomInfo
                roomId={roomId}
                isHost={isHost}
                participants={participants}
                onCopy={handleCopyRoomId}
              />
              <div className="sidebar-divider" />
              <AdminControls
                media={media}
                playlist={playlist}
                uploadProgress={uploadProgress}
                participants={participants}
                controllers={controllers}
                hostId={hostId || (isHost ? myId : null)}
                isHost={isHost}
                myId={myId}
                onFileSelect={handleFileSelect}
                onSelectPlaylistItem={handleSelectPlaylistItem}
                onRemovePlaylistItem={handleRemovePlaylistItem}
                onToggleControl={handleToggleControl}
                onRemoveParticipant={handleRemoveParticipant}
              />
            </>
          )}

          {/* Passenger Panel — Non-host participants (shows Co-Host controls if granted) */}
          {!isHost && (
            <PassengerPanel
              roomId={roomId}
              hasControl={hasControl}
              media={media}
              playlist={playlist}
              uploadProgress={uploadProgress}
              onFileSelect={handleFileSelect}
              onSelectPlaylistItem={handleSelectPlaylistItem}
              onRemovePlaylistItem={handleRemovePlaylistItem}
              onLeaveRoom={handleLeaveRoom}
            />
          )}

          <ChatBox messages={messages} onSend={handleChatSend} />

        </aside>

        {/* ── Player area ── */}
        <main className="room-player">
          <div className="room-player-stage">
            {!media ? (
              <div className="no-media">
                <span className="no-media-icon">{hasControl ? '📂' : '⏳'}</span>
                <p className="no-media-title">
                  {hasControl ? 'No file selected yet' : 'Waiting for host…'}
                </p>
                <p className="no-media-sub">
                  {hasControl
                    ? 'Use the "+ Add Songs / Videos" button in the sidebar to choose video or audio tracks.'
                    : 'The host hasn\'t selected a media file yet. Hang tight!'}
                </p>
              </div>
            ) : (
              <div className="stage-ambient-card">
                <div className="stage-ambient-glow" />
                <span className="stage-badge">▶ Playing in Bottom Tab</span>
                <h2 className="stage-title">{media.name}</h2>
                <p className="stage-sub">
                  Playback controls are available in the small tab at the bottom
                </p>
              </div>
            )}
          </div>

          {/* ── Small media player tab at the bottom ── */}
          <div className="room-bottom-dock">
            {media ? (
              <MediaPlayer
                ref={playerRef}
                src={media.url}
                mediaName={media.name}
                isHost={isHost}
                hasControl={hasControl}
                playlist={playlist}
                playing={playing}
                seekPosition={seekPosition}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onSync={handleSync}
                onNextTrack={handleNextTrack}
                onPrevTrack={handlePrevTrack}
              />
            ) : (
              <div className="mp-tab-empty-bar">
                <div className="mp-tab-empty-info">
                  <span className="mp-tab-empty-icon">🎵</span>
                  <span className="mp-tab-empty-text">No track playing</span>
                </div>
                <span className="mp-tab-empty-hint">Upload or select songs/videos from sidebar</span>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Floating Video Meet Overlay ── */}
      {showMeet && (
        <div
          className="room-meet-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMeet(false)
          }}
        >
          <MeetBox
            participantName={participantName}
            isHost={isHost}
            onClose={() => setShowMeet(false)}
          />
        </div>
      )}
    </div>
  )
}

export default Room
