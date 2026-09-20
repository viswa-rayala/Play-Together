import '../styles/ConnectionStatus.css'

/**
 * ConnectionStatus
 * Props:
 *   status: 'connecting' | 'connected' | 'disconnected'
 */
function ConnectionStatus({ status }) {
  const map = {
    connected:    { label: 'Connected',    cls: 'connected'    },
    connecting:   { label: 'Connecting…',  cls: 'connecting'   },
    disconnected: { label: 'Disconnected', cls: 'disconnected' },
  }
  const { label, cls } = map[status] || map.disconnected

  return (
    <div className="conn-status" title={label}>
      <span className={`conn-dot ${cls}`} aria-hidden="true" />
      <span className="conn-label">{label}</span>
    </div>
  )
}

export default ConnectionStatus
