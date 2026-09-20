import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/JoinRoom.css'

function JoinRoom() {
  const navigate = useNavigate()
  const [roomId, setRoomId] = useState('')
  const [error,  setError]  = useState('')

  const validate = (id) => {
    const v = id.trim().toUpperCase()
    if (!v)                        return 'Please enter a Room ID.'
    if (v.length < 4)              return 'Room ID is too short (min 4 characters).'
    if (v.length > 10)             return 'Room ID is too long (max 10 characters).'
    if (!/^[A-Z0-9]+$/.test(v))   return 'Room ID can only contain letters and numbers.'
    return ''
  }

  const handleJoin = () => {
    const v = roomId.trim().toUpperCase()
    const err = validate(v)
    if (err) { setError(err); return }
    setError('')
    navigate(`/room/${v}?host=false`)
  }

  const handleChange = (e) => {
    setRoomId(e.target.value)
    if (error) setError('')        // clear error as user types
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleJoin()
  }

  return (
    <div className="page-container">
      <div className="card join-card">

        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>

        <h1 className="join-title">Join a Room</h1>
        <p className="join-sub">Enter the Room ID shared by the host.</p>

        <div className="input-group">
          <label htmlFor="room-id-input">Room ID</label>
          <input
            id="room-id-input"
            type="text"
            className={`room-id-input ${error ? 'input-error' : ''}`}
            placeholder="e.g. ABC123"
            value={roomId}
            maxLength={10}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          {error && (
            <span className="error-msg" role="alert">{error}</span>
          )}
        </div>

        <button
          id="btn-join-confirm"
          className="btn btn-primary join-cta"
          onClick={handleJoin}
        >
          🔗 Join Room
        </button>

      </div>
    </div>
  )
}

export default JoinRoom
