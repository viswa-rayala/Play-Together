import { useRef } from 'react'
import '../styles/PassengerPanel.css'

/**
 * PassengerPanel — sidebar for non-host participants.
 * If granted Co-Host control, provides playlist switching and upload access.
 *
 * Props:
 *   roomId              {string}
 *   hasControl          {boolean}
 *   media               {object | null}
 *   playlist            {Array<{name, url}>}
 *   uploadProgress      {number | null}
 *   onFileSelect        {(FileList|File[]) => void}
 *   onSelectPlaylistItem{(item) => void}
 *   onRemovePlaylistItem{(name) => void}
 *   onLeaveRoom         {() => void}
 */
function PassengerPanel({
  roomId,
  hasControl,
  media,
  playlist = [],
  uploadProgress,
  onFileSelect,
  onSelectPlaylistItem,
  onRemovePlaylistItem,
  onLeaveRoom,
}) {
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileSelect?.(files)
    }
    e.target.value = ''
  }

  const isAudioFile = (name = '') => /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(name)

  return (
    <div className="passenger-panel">

      {/* Co-Host status indicator if granted control */}
      {hasControl ? (
        <div className="pp-cohost-banner">
          <span className="pp-cohost-icon">🎮</span>
          <div className="pp-cohost-text">
            <strong>Co-Host Access Active</strong>
            <span>You can control playback & switch playlist tracks</span>
          </div>
        </div>
      ) : (
        <div className="pp-viewer-banner">
          <span>👁 Viewer Mode — Synchronized with Host</span>
        </div>
      )}

      {/* Room ID section */}
      <div className="pp-section">
        <p className="pp-label">Room ID</p>
        <div className="pp-room-id" aria-label={`Room ID: ${roomId}`}>
          {roomId}
        </div>
      </div>

      {/* Media Playlist & Queue */}
      <div className="pp-section">
        <div className="pp-playlist-header">
          <p className="pp-label">
            🎵 Playlist Queue
            <span className="pp-count-badge">{playlist.length}</span>
          </p>
          {hasControl && (
            <button
              type="button"
              className="btn btn-secondary pp-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadProgress !== null}
            >
              {uploadProgress !== null ? `${Math.round(uploadProgress * 100)}%` : '+ Add Media'}
            </button>
          )}
        </div>

        {hasControl && (
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
            aria-hidden="true"
          />
        )}

        {playlist.length === 0 ? (
          <p className="pp-empty-hint">No tracks in playlist yet.</p>
        ) : (
          <ul className="pp-playlist-list">
            {playlist.map((item, index) => {
              const isActive = media?.name === item.name
              return (
                <li
                  key={`${item.name}-${index}`}
                  className={`pp-playlist-item ${isActive ? 'active' : ''} ${hasControl ? 'clickable' : ''}`}
                >
                  <button
                    type="button"
                    className="pp-playlist-btn"
                    onClick={() => hasControl && onSelectPlaylistItem?.(item)}
                    disabled={!hasControl}
                    title={hasControl ? `Play ${item.name}` : item.name}
                  >
                    <span className="pp-playlist-icon">
                      {isAudioFile(item.name) ? '🎵' : '🎬'}
                    </span>
                    <span className="pp-playlist-name">{item.name}</span>
                    {isActive && <span className="pp-active-tag">Playing</span>}
                  </button>

                  {hasControl && (
                    <button
                      type="button"
                      className="pp-item-del-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemovePlaylistItem?.(item.name)
                      }}
                      title={`Remove ${item.name}`}
                      aria-label={`Remove ${item.name}`}
                    >
                      ✕
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
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
