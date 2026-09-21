import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import mediaSocket from '../services/mediaSocket'
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

    mediaSocket.on('CONNECTION_STATUS',  onConnStatus)
    mediaSocket.on('ROOM_STATE',         onRoomState)
    mediaSocket.on('PARTICIPANT_JOINED', onParticipantJoined)
    mediaSocket.on('PARTICIPANT_LEFT',   onParticipantLeft)
    mediaSocket.on('PLAY',               onPlay)
    mediaSocket.on('PAUSE',              onPause)
    mediaSocket.on('SEEK',               onSeek)
    mediaSocket.on('MEDIA_SELECTED',     onMediaSelected)

    // Connect to room
    mediaSocket.connect(roomId, isHost)

    // Cleanup on unmount
    return () => {
      mediaSocket.off('CONNECTION_STATUS',  onConnStatus)
      mediaSocket.off('ROOM_STATE',         onRoomState)
      mediaSocket.off('PARTICIPANT_JOINED', onParticipantJoined)
      mediaSocket.off('PARTICIPANT_LEFT',   onParticipantLeft)
      mediaSocket.off('PLAY',               onPlay)
      mediaSocket.off('PAUSE',              onPause)
      mediaSocket.off('SEEK',               onSeek)
      mediaSocket.off('MEDIA_SELECTED',     onMediaSelected)
      mediaSocket.disconnect()
    }
  }, [roomId, isHost])

  // ── Host callbacks ─────────────────────────────────────────────────────────────
  const handleFileSelect = async (file) => {
    try {
      const uploadedMedia = await mediaSocket.uploadMedia(file)
      setMedia(uploadedMedia)
      mediaSocket.sendMediaSelected(uploadedMedia.name)
    } catch (error) {
      setConnStatus('error')
      console.error('Media upload failed:', error)
    }
  }

  const handlePlay  = (pos) => { setPlaying(true);  setSeekPosition(pos); mediaSocket.sendPlay(pos) }
  const handlePause = (pos) => { setPlaying(false); setSeekPosition(pos); mediaSocket.sendPause(pos) }
  const handleSeek  = (pos) => { setSeekPosition(pos); mediaSocket.sendSeek(pos) }

  /**
   * handleAddParticipant — wires to socketService.addParticipant.
   * Real WS: ws.send({ type: 'ADD_PARTICIPANT', name })
   */
  const handleAddParticipant = (name) => {
    // Participant management is owned by the realtime server.
  }

  /**
   * handleRemoveParticipant — wires to socketService.removeParticipant.
   * Real WS: ws.send({ type: 'REMOVE_PARTICIPANT', id })
   */
  const handleRemoveParticipant = (id) => {
    // Participant management is owned by the realtime server.
  }

  /**
   * handleLeaveRoom — used by both host header and PassengerPanel Leave button.
   * Real WS: socketService.leaveRoom() sends LEAVE_ROOM before teardown.
   */
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
