import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import socketService from '../services/socket'
import MediaPlayer     from '../components/MediaPlayer'
import RoomInfo        from '../components/RoomInfo'
import AdminControls   from '../components/AdminControls'
import PassengerPanel  from '../components/PassengerPanel'
import ConnectionStatus from '../components/ConnectionStatus'
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

  // ── State ───────────────────────────────────────────────────────────────────
  const [connStatus,    setConnStatus]   = useState('connecting')
  const [participants,  setParticipants] = useState([])  // [{id, name}]
  const [media,         setMedia]        = useState(null)   // { name, url }
  const [playing,       setPlaying]      = useState(false)
  const [seekPosition,  setSeekPosition] = useState(0)

  const playerRef = useRef(null)

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Named handlers so we can remove them on cleanup
    const onConnStatus      = ({ status }) => setConnStatus(status)
    const onRoomState       = (s) => {
      setParticipants(s.participants)          // now an array
      if (s.media) setMedia(s.media)
      setPlaying(s.playback.playing)
      setSeekPosition(s.playback.position)
    }
    const onParticipantJoined = ({ participants }) => setParticipants(participants)
    const onParticipantLeft   = ({ participants }) => setParticipants(participants)
    const onPlay    = ({ position }) => { setPlaying(true);  setSeekPosition(position) }
    const onPause   = ({ position }) => { setPlaying(false); setSeekPosition(position) }
    const onSeek    = ({ position }) => setSeekPosition(position)
    const onMediaSelected = ({ media }) => setMedia(media)

    socketService.on('CONNECTION_STATUS',  onConnStatus)
    socketService.on('ROOM_STATE',         onRoomState)
    socketService.on('PARTICIPANT_JOINED', onParticipantJoined)
    socketService.on('PARTICIPANT_LEFT',   onParticipantLeft)
    socketService.on('PLAY',               onPlay)
    socketService.on('PAUSE',              onPause)
    socketService.on('SEEK',               onSeek)
    socketService.on('MEDIA_SELECTED',     onMediaSelected)

    // Connect to room
    if (isHost) socketService.connect(roomId, true)
    else        socketService.joinRoom(roomId)

    // Cleanup on unmount
    return () => {
      socketService.off('CONNECTION_STATUS',  onConnStatus)
      socketService.off('ROOM_STATE',         onRoomState)
      socketService.off('PARTICIPANT_JOINED', onParticipantJoined)
      socketService.off('PARTICIPANT_LEFT',   onParticipantLeft)
      socketService.off('PLAY',               onPlay)
      socketService.off('PAUSE',              onPause)
      socketService.off('SEEK',               onSeek)
      socketService.off('MEDIA_SELECTED',     onMediaSelected)
      socketService.disconnect()
    }
  }, [roomId, isHost])

  // ── Host callbacks ─────────────────────────────────────────────────────────────
  const handleFileSelect = (file) => {
    // Revoke previous blob URL to free memory
    if (media?.url?.startsWith('blob:')) URL.revokeObjectURL(media.url)
    const url = URL.createObjectURL(file)
    setMedia({ name: file.name, url })
    socketService.sendMediaSelected(file.name, url)
  }

  const handlePlay  = (pos) => { setPlaying(true);  setSeekPosition(pos); socketService.sendPlay(pos) }
  const handlePause = (pos) => { setPlaying(false); setSeekPosition(pos); socketService.sendPause(pos) }
  const handleSeek  = (pos) => { setSeekPosition(pos); socketService.sendSeek(pos) }

  /**
   * handleAddParticipant — wires to socketService.addParticipant.
   * Real WS: ws.send({ type: 'ADD_PARTICIPANT', name })
   */
  const handleAddParticipant = (name) => {
    socketService.addParticipant(name)
  }

  /**
   * handleRemoveParticipant — wires to socketService.removeParticipant.
   * Real WS: ws.send({ type: 'REMOVE_PARTICIPANT', id })
   */
  const handleRemoveParticipant = (id) => {
    socketService.removeParticipant(id)
  }

  /**
   * handleLeaveRoom — used by both host header and PassengerPanel Leave button.
   * Real WS: socketService.leaveRoom() sends LEAVE_ROOM before teardown.
   */
  const handleLeaveRoom = () => {
    socketService.leaveRoom()
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
                participants={participants}
                onFileSelect={handleFileSelect}
                onRemoveParticipant={handleRemoveParticipant}
                onAddParticipant={handleAddParticipant}
              />
            </>
          )}

          {/* Passenger Panel — Room ID + Leave only, no other controls */}
          {!isHost && (
            <PassengerPanel
              roomId={roomId}
              onLeaveRoom={handleLeaveRoom}
            />
          )}

        </aside>

        {/* ── Player area ── */}
        <main className="room-player">
          {!media ? (
            <div className="no-media">
              <span className="no-media-icon">{isHost ? '📂' : '⏳'}</span>
              <p className="no-media-title">
                {isHost ? 'No file selected yet' : 'Waiting for host…'}
              </p>
              <p className="no-media-sub">
                {isHost
                  ? 'Use the "Select File" button in the sidebar to choose a video or audio file.'
                  : 'The host hasn\'t selected a media file yet. Hang tight!'}
              </p>
            </div>
          ) : (
            <MediaPlayer
              ref={playerRef}
              src={media.url}
              mediaName={media.name}
              isHost={isHost}
              playing={playing}
              seekPosition={seekPosition}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
            />
          )}
        </main>

      </div>
    </div>
  )
}

export default Room
