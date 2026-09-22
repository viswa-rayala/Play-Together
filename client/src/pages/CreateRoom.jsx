import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoomRequest } from '../services/api'
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
  const [hostName, setHostName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error,    setError]    = useState('')

  const handleCreate = async () => {
    if (creating) return

    const cleanName = hostName.trim()
    if (!cleanName) {
      setError('Please enter your name before creating a room.')
      return
    }

    const id = generateRoomId()
    setCreating(true)
    setError('')

    try {
      const result = await createRoomRequest(id, cleanName)
      const createdId = result.roomId
      setRoomId(createdId)
      setTimeout(() => navigate(`/room/${createdId}?host=true&name=${encodeURIComponent(cleanName)}`), 700)
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

        <div className="input-group">
          <label htmlFor="host-name-input">Your Name</label>
          <input
            id="host-name-input"
            type="text"
            className={`room-id-input ${error ? 'input-error' : ''}`}
            placeholder="e.g. Alex"
            value={hostName}
            maxLength={30}
            onChange={(e) => {
              setHostName(e.target.value)
              if (error) setError('')
            }}
            autoComplete="name"
            spellCheck={false}
          />
        </div>

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
