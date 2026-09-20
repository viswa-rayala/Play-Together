import '../styles/PassengerPanel.css'

/**
 * PassengerPanel — stripped-down sidebar for non-host participants.
 * Shows ONLY: Room ID (read-only display) + Leave Room button.
 * No play/pause, no media selection, no participant management.
 *
 * Props:
 *   roomId      {string}    the current room identifier
 *   onLeaveRoom {() => void} called when the passenger clicks Leave
 */
function PassengerPanel({ roomId, onLeaveRoom }) {
  return (
    <div className="passenger-panel">

      {/* Room ID — display only, no copy */}
      <div className="pp-section">
        <p className="pp-label">Room ID</p>
        <div className="pp-room-id" aria-label={`Room ID: ${roomId}`}>
          {roomId}
        </div>
      </div>

      {/* Leave button */}
      <button
        id="btn-passenger-leave"
        className="btn btn-danger pp-leave-btn"
        onClick={onLeaveRoom}
      >
        🚪 Leave Room
      </button>

    </div>
  )
}

export default PassengerPanel
