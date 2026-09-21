import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoomRequest } from '../services/api'
import socketService from '../services/socket'
import '../styles/CreateRoom.css'

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 6; i += 1) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

function CreateRoom() {
  const navigate  = useNavigate()
  const [roomId,   setRoomId]   = useState('')
  const [creating, setCreating] = useState(false)
  const [error,    setError]    = useState('')

  const handleCreate = async () => {
    if (creating) return

    const id = generateRoomId()
    setCreating(true)
    setError('')

    try {
      const result = await createRoomRequest(id, 'host')
      const createdId = result.roomId
      setRoomId(createdId)
      socketService.createRoom(createdId)
      setTimeout(() => navigate(`/room/${createdId}?host=true`), 700)
    } catch (err) {
      setError(err.message || 'Unable to create room.')
      setCreating(false)
    }
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

        {error && <p className="error-msg" role="alert">{error}</p>}

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
