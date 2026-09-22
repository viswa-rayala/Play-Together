import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { validateRoomRequest } from '../services/api'
import '../styles/JoinRoom.css'

function JoinRoom() {
  const navigate = useNavigate()
  const [roomId, setRoomId] = useState('')
  const [name, setName] = useState('')
  const [error,  setError]  = useState('')
  const [joining, setJoining] = useState(false)

  const validate = (id) => {
    const v = id.trim().toUpperCase()
    if (!v)                        return 'Please enter a Room ID.'
    if (v.length < 4)              return 'Room ID is too short (min 4 characters).'
    if (v.length > 10)             return 'Room ID is too long (max 10 characters).'
    if (!/^[A-Z0-9]+$/.test(v))   return 'Room ID can only contain letters and numbers.'
    return ''
  }

  const handleJoin = async () => {
    const v = roomId.trim().toUpperCase()
    const cleanName = name.trim()
    const err = validate(v)

    if (!cleanName) {
      setError('Please enter your name before joining.')
      return
    }

    if (err) { setError(err); return }

    setJoining(true)
    setError('')

    try {
      const result = await validateRoomRequest(v)
      if (!result.valid) {
        setError('Room not found or inactive.')
        setJoining(false)
        return
      }

      navigate(`/room/${v}?host=false&name=${encodeURIComponent(cleanName)}`)
    } catch (joinError) {
      setError(joinError.message || 'Unable to validate room.')
      setJoining(false)
    }
  }

  const handleChange = (e) => {
    setRoomId(e.target.value)
    if (error) setError('')
  }

  const handleNameChange = (e) => {
    setName(e.target.value)
    if (error) setError('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleJoin()
  }

  return (
    <div className="page-container">
      <div className="card join-card">

        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>

        <h1 className="join-title">Join a Room</h1>
        <p className="join-sub">Enter your name and the Room ID shared by the host.</p>

        <div className="input-group">
          <label htmlFor="participant-name-input">Your Name</label>
          <input
            id="participant-name-input"
            type="text"
            className={`room-id-input ${error ? 'input-error' : ''}`}
            placeholder="e.g. Alex"
            value={name}
            maxLength={30}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            autoComplete="name"
            spellCheck={false}
          />
        </div>

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
          disabled={joining}
        >
          {joining ? 'Checking room…' : '🔗 Join Room'}
        </button>

      </div>
    </div>
  )
}

export default JoinRoom
