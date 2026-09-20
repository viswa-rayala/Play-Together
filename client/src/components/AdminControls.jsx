import { useRef, useState } from 'react'
import '../styles/AdminControls.css'

/**
 * AdminControls — full Admin Panel for the host sidebar.
 * Pure UI — no socket/network logic inside.
 *
 * Props:
 *   media               {object | null}          { name, url }
 *   participants        {Array<{id,name}>}        live participant list
 *   onFileSelect        {(File)    => void}
 *   onRemoveParticipant {(id)      => void}       kick a participant
 *   onAddParticipant    {(name)    => void}       add a participant by name
 */
function AdminControls({
  media,
  participants,
  onFileSelect,
  onRemoveParticipant,
  onAddParticipant,
}) {
  const fileInputRef  = useRef(null)
  const [newName, setNewName] = useState('')

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    onAddParticipant?.(trimmed)
    setNewName('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) onFileSelect(file)
    // Reset so the same file can be re-picked if needed
    e.target.value = ''
  }

  return (
    <div className="admin-controls">

      {/* ── Section: Media File ── */}
      <section className="ac-section">
        <p className="ac-section-label">📂 Media File</p>

        <button
          id="btn-select-media"
          className="btn btn-secondary ac-pick-btn"
          onClick={() => fileInputRef.current.click()}
        >
          {media ? '📂 Change File' : '📂 Select File'}
        </button>

        {/* Hidden native file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          aria-hidden="true"
        />

        {media && (
          <div className="ac-media-info" title={media.name}>
            <span className="ac-media-icon">
              {media.name.match(/\.(mp3|wav|ogg|aac|flac|m4a)$/i) ? '🎵' : '🎬'}
            </span>
            <span className="ac-media-name">{media.name}</span>
          </div>
        )}
      </section>

      <div className="ac-divider" />

      {/* ── Section: Participants ── */}
      <section className="ac-section">
        <p className="ac-section-label">
          👥 Participants
          <span className="ac-count-badge">{participants.length}</span>
        </p>

        {participants.length === 0 ? (
          <p className="ac-empty-hint">No one has joined yet.</p>
        ) : (
          <ul className="ac-participant-list">
            {participants.map((p) => (
              <li key={p.id} className="ac-participant-row">
                <span className="ac-participant-name" title={p.id}>
                  {p.name}
                </span>
                <button
                  className="ac-kick-btn"
                  onClick={() => onRemoveParticipant(p.id)}
                  aria-label={`Remove ${p.name}`}
                  title={`Kick ${p.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="ac-divider" />

      {/* ── Section: Add Participant ── */}
      <section className="ac-section">
        <p className="ac-section-label">➕ Add Participant</p>
        <div className="ac-add-row">
          <input
            id="input-add-participant"
            type="text"
            className="ac-add-input"
            placeholder="Enter name…"
            value={newName}
            maxLength={32}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            id="btn-add-participant"
            className="btn btn-primary ac-add-btn"
            onClick={handleAdd}
            disabled={!newName.trim()}
          >
            Add
          </button>
        </div>
      </section>

    </div>
  )
}

export default AdminControls
