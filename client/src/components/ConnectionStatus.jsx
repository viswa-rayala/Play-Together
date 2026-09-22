import React from 'react';

/**
 * ConnectionStatus — Elegant network status indicator
 *
 * States: 'connected' | 'connecting' | 'disconnected'
 * Designed for easy backend integration:
 *   - Replace `status` prop with real socket.isConnected state
 */
export default function ConnectionStatus({
  status = 'connecting',
  showLabel = true,
  size = 'md',
}) {
  const config = {
    connected: {
      color: 'var(--accent-cyan)',
      glow: 'rgba(6,182,212,0.4)',
      label: 'Connected',
      pulse: true,
    },
    connecting: {
      color: '#fbbf24',
      glow: 'rgba(251,191,36,0.4)',
      label: 'Connecting…',
      pulse: true,
    },
    disconnected: {
      color: '#f87171',
      glow: 'rgba(248,113,113,0.3)',
      label: 'Disconnected',
      pulse: false,
    },
  };

  const { color, glow, label, pulse } = config[status] || config.disconnected;

  const dotSize = size === 'sm' ? 7 : size === 'lg' ? 11 : 9;
  const fontSize = size === 'sm' ? '12px' : size === 'lg' ? '15px' : '13px';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
      }}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${label}`}
    >
      {/* Dot with ping ring */}
      <span
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${dotSize + 8}px`,
          height: `${dotSize + 8}px`,
          flexShrink: 0,
        }}
      >
        {/* Ping ring */}
        {pulse && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: color,
              opacity: 0.25,
            }}
          />
        )}
        {/* Solid dot */}
        <span
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 8px ${glow}`,
            flexShrink: 0,
          }}
        />
      </span>

      {showLabel && (
        <span
          style={{
            fontSize,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            letterSpacing: '0.2px',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
