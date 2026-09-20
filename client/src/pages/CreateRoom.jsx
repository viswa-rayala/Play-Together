import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import socketService from '../services/socket'
import '../styles/CreateRoom.css'

// Generates a random 6-character alphanumeric room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function CreateRoom() {
  const navigate  = useNavigate()
  const [roomId,   setRoomId]   = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = () => {
    if (creating) return
    const id = generateRoomId()
    setRoomId(id)
    setCreating(true)
    socketService.createRoom(id)         // start mock connection
    setTimeout(() => navigate(`/room/${id}?host=true`), 1100)
  }

  return (
    <div className="page-container">
      <div className="card create-card">

        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>

        <h1 className="create-title">Create a Room</h1>
        <p className="create-sub">
          You'll be the <span className="host-tag">Host</span>. Share the Room ID with friends on the same network.
        </p>

        {roomId && (
          <div className="room-id-preview" aria-live="polite">
            <span className="preview-label">Your Room ID</span>
            <span className="preview-id">{roomId}</span>
          </div>
        )}

        <button
          id="btn-create-confirm"
          className="btn btn-primary create-cta"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? '⏳ Creating…' : '🎬 Create Room'}
        </button>

        <p className="create-hint">Everyone must be on the same Wi-Fi / hotspot</p>
      </div>
    </div>
  )
}

export default CreateRoom
