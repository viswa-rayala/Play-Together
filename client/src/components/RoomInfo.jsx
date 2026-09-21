import React, { useState } from 'react';
import { Copy, Check, Users, Crown, UserCircle } from 'lucide-react';

/**
 * RoomInfo — Displays room metadata
 * Backend-ready: pass real roomId, participants, isHost from socket ROOM_STATE
 */
export default function RoomInfo({
  roomId,
  participants = 0,
  isHost = false,
  connectionStatus = 'connected',
  compact = false,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard
      const el = document.createElement('textarea');
      el.value = roomId;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: 'var(--accent-blue-bright)', letterSpacing: '2px' }}>
          {roomId || '------'}
        </span>
        <CopyButton copied={copied} onClick={handleCopy} roomId={roomId} />
        <RoleBadge isHost={isHost} />
        <ParticipantBadge count={participants} />
      </div>
    );
  }

  return (
    <div
      className="card card-elevated"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
      aria-label="Room information"
    >
      {/* Room ID */}
      <div>
        <p className="label" style={{ marginBottom: '10px' }}>Room ID</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              flex: 1,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              fontFamily: 'var(--font-mono)',
              fontSize: '24px',
              fontWeight: 600,
              letterSpacing: '4px',
              color: 'var(--accent-blue-bright)',
              textAlign: 'center',
              boxShadow: '0 0 20px rgba(59,130,246,0.1)',
            }}
            aria-label={`Room ID: ${roomId}`}
          >
            {roomId || '------'}
          </div>
          <CopyButton copied={copied} onClick={handleCopy} roomId={roomId} large />
        </div>
        {copied && (
          <p style={{ fontSize: '12px', color: 'var(--accent-cyan)', marginTop: '8px', textAlign: 'center' }}>
            ✓ Room ID copied to clipboard
          </p>
        )}
      </div>

      {/* Status Row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <RoleBadge isHost={isHost} />
        <ParticipantBadge count={participants} />
      </div>
    </div>
  );
}

function CopyButton({ copied, onClick, roomId, large = false }) {
  return (
    <button
      onClick={onClick}
      disabled={!roomId}
      className={`btn btn-ghost ${large ? '' : 'btn-sm'} btn-icon`}
      style={{ width: large ? '52px' : '38px', height: large ? '52px' : '38px', borderRadius: 'var(--radius-md)' }}
      aria-label={copied ? 'Copied!' : 'Copy room ID'}
      title={copied ? 'Copied!' : 'Copy Room ID'}
    >
      {copied
        ? <Check size={large ? 20 : 16} color="var(--accent-cyan)" />
        : <Copy size={large ? 20 : 16} />
      }
    </button>
  );
}

function RoleBadge({ isHost }) {
  return (
    <span className={`badge ${isHost ? 'badge-purple' : 'badge-blue'}`}>
      {isHost ? <Crown size={10} /> : <UserCircle size={10} />}
      {isHost ? 'Host' : 'Participant'}
    </span>
  );
}

function ParticipantBadge({ count }) {
  return (
    <span className="badge badge-cyan">
      <Users size={10} />
      {count} {count === 1 ? 'participant' : 'participants'}
    </span>
  );
}
