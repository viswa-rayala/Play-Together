import { useRef } from 'react'
import '../styles/AdminControls.css'

/**
 * AdminControls — full Admin Panel for the host sidebar.
 * Includes multi-file uploading, playlist switching, and co-host control delegation.
 *
 * Props:
 *   media               {object | null}          { name, url }
 *   playlist            {Array<{name, url}>}     playlist items
 *   uploadProgress      {number | null}
 *   participants        {Array<{id,name}>}       live participant list
 *   controllers         {Array<string>}          socket IDs granted control
 *   onFileSelect        {(FileList|File[]) => void}
 *   onSelectPlaylistItem{(item) => void}
 *   onRemovePlaylistItem{(name) => void}
 *   onToggleControl     {(targetId) => void}
 *   onRemoveParticipant {(id) => void}
 */
function AdminControls({
  media,
  playlist = [],
  uploadProgress,
  participants = [],
  controllers = [],
  hostId,
  isHost,
  myId,
  onFileSelect,
  onSelectPlaylistItem,
  onRemovePlaylistItem,
  onToggleControl,
  onRemoveParticipant,
}) {
  const fileInputRef  = useRef(null)

  const handleFileChange = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileSelect(files)
    }
    // Reset so the same files can be re-picked if needed
    e.target.value = ''
  }

  const isAudioFile = (name = '') => /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(name)

  return (
    <div className="admin-controls">

      {/* ── Section: Media Upload & Playlist ── */}
      <section className="ac-section">
        <div className="ac-section-header">
          <p className="ac-section-label">
            📂 Media & Playlist
            <span className="ac-count-badge">{playlist.length}</span>
          </p>
        </div>

        <button
          id="btn-select-media"
          className="btn btn-secondary ac-pick-btn"
          onClick={() => fileInputRef.current.click()}
          disabled={uploadProgress !== null}
        >
          {uploadProgress !== null
            ? `Uploading ${Math.round(uploadProgress * 100)}%`
            : '+ Add Songs / Videos'}
        </button>

        {uploadProgress !== null && (
          <progress
            className="ac-upload-progress"
            value={uploadProgress}
            max="1"
            aria-label="Media upload progress"
          />
        )}

        {/* Hidden native multiple file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
          aria-hidden="true"
        />

        {/* Playlist Queue */}
        {playlist.length === 0 ? (
          <p className="ac-empty-hint">No media in playlist. Upload files above.</p>
        ) : (
          <ul className="ac-playlist-list" aria-label="Media Playlist">
            {playlist.map((item, index) => {
              const isActive = media?.name === item.name
              return (
                <li
                  key={`${item.name}-${index}`}
                  className={`ac-playlist-item ${isActive ? 'active' : ''}`}
                >
                  <button
                    type="button"
                    className="ac-playlist-select-btn"
                    onClick={() => onSelectPlaylistItem?.(item)}
                    title={`Play ${item.name}`}
                  >
                    <span className="ac-playlist-icon">
                      {isAudioFile(item.name) ? '🎵' : '🎬'}
                    </span>
                    <span className="ac-playlist-name">{item.name}</span>
                    {isActive && <span className="ac-now-playing-tag">▶ Playing</span>}
                  </button>

                  <button
                    type="button"
                    className="ac-item-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemovePlaylistItem?.(item.name)
                    }}
                    title={`Remove ${item.name} from playlist`}
                    aria-label={`Remove ${item.name}`}
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="ac-divider" />

      {/* ── Section: Participants & Permission Delegation ── */}
      <section className="ac-section">
        <p className="ac-section-label">
          👥 Participants & Co-Hosts
          <span className="ac-count-badge">{participants.length}</span>
        </p>

        {participants.length === 0 ? (
          <p className="ac-empty-hint">No one has joined yet.</p>
        ) : (
          <ul className="ac-participant-list">
            {participants.map((p) => {
              const currentHostId = hostId || participants.find((item) => item.isHost)?.id
              const isThisHost = Boolean(currentHostId ? p.id === currentHostId : p.isHost)
              const isCoHost = !isThisHost && Array.isArray(controllers) && controllers.includes(p.id)
              const isMe = Boolean(myId && p.id === myId)

              return (
                <li
                  key={p.id}
                  className={`ac-participant-row ${isThisHost ? 'is-host' : isCoHost ? 'is-cohost' : ''}`}
                >
                  <div className="ac-participant-info">
                    <span className="ac-participant-name" title={p.id}>
                      {p.name} {isMe ? '(You)' : ''}
                    </span>
                    {isThisHost ? (
                      <span className="ac-host-badge">👑 Host</span>
                    ) : isCoHost ? (
                      <span className="ac-cohost-badge">🎮 Co-Host</span>
                    ) : (
                      <span className="ac-viewer-badge">👤 Viewer</span>
                    )}
                  </div>

                  <div className="ac-participant-actions">
                    {!isThisHost && (
                      <>
                        <button
                          type="button"
                          className={`ac-control-toggle-btn ${isCoHost ? 'active' : ''}`}
                          onClick={() => onToggleControl?.(p.id)}
                          title={
                            isCoHost
                              ? `Revoke playback control from ${p.name}`
                              : `Give playback control to ${p.name}`
                          }
                        >
                          {isCoHost ? 'Revoke Control' : 'Give Control'}
                        </button>

                        <button
                          type="button"
                          className="ac-kick-btn"
                          onClick={() => onRemoveParticipant?.(p.id)}
                          aria-label={`Remove ${p.name}`}
                          title={`Remove ${p.name} from room`}
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

    </div>
  )
}

export default AdminControls
