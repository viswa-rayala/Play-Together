import { useRef } from 'react'
import '../styles/HostControls.css'

/**
 * HostControls
 * File-picker for the host to select a local media file.
 * Does NOT contain any socket/network logic.
 *
 * Props:
 *   media        {object | null}  { name, url }
 *   onFileSelect {(File) => void}
 */
function HostControls({ media, onFileSelect }) {
  const fileInputRef = useRef(null)

  const handleChange = (e) => {
    const file = e.target.files[0]
    if (file) onFileSelect(file)
    // Reset input so the same file can be re-selected if needed
    e.target.value = ''
  }

  return (
    <div className="host-controls">
      <p className="section-label">Media File</p>

      <button
        id="btn-select-media"
        className="btn btn-secondary hc-pick-btn"
        onClick={() => fileInputRef.current.click()}
      >
        {media ? '📂 Change File' : '📂 Select File'}
      </button>

      {/* Hidden native file input — only video and audio */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*"
        style={{ display: 'none' }}
        onChange={handleChange}
        aria-hidden="true"
      />

      {media && (
        <div className="hc-media-info" title={media.name}>
          <span className="hc-media-icon">{media.name.match(/\.(mp3|wav|ogg|aac|flac|m4a)$/i) ? '🎵' : '🎬'}</span>
          <span className="hc-media-name">{media.name}</span>
        </div>
      )}
    </div>
  )
}

export default HostControls
