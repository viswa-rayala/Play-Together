import { useState } from 'react'
import '../styles/RoomInfo.css'

/**
 * RoomInfo
 * Shows Room ID (with copy button), role badge, and participant count.
 *
 * Props:
 *   roomId       {string}
 *   isHost       {boolean}
 *   participants {Array<{id:string, name:string}>}
 *   onCopy       {() => void}
 */
function RoomInfo({ roomId, isHost, participants, onCopy }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="room-info">
      {/* Room ID */}
      <div className="ri-row">
        <span className="section-label">Room ID</span>
        <div className="ri-id-box">
          <span className="ri-id-text">{roomId}</span>
          <button
            id="btn-copy-room-id"
            className={`ri-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Copy Room ID"
            aria-label="Copy Room ID"
          >
            {copied ? '✓' : '⎘'}
          </button>
        </div>
      </div>

      {/* Role */}
      <div className="ri-row">
        <span className="section-label">Your Role</span>
        <span className={`ri-role-badge ${isHost ? 'host' : 'participant'}`}>
          {isHost ? '👑 Host' : '👤 Participant'}
        </span>
      </div>

      {/* Participant count */}
      <div className="ri-row">
        <span className="section-label">In Room</span>
        <span className="ri-count">
          👥 {participants.length} {participants.length === 1 ? 'person' : 'people'}
        </span>
      </div>
    </div>
  )
}

export default RoomInfo
