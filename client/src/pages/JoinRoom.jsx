import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowRight, Wifi, AlertCircle } from 'lucide-react';
import ConnectionStatus from '../components/ConnectionStatus';
import socketService from '../services/socket';

export default function JoinRoom() {
  const navigate = useNavigate();
  const [roomInput, setRoomInput] = useState('');
  const [error, setError] = useState('');
  const [connectionState, setConnectionState] = useState('idle'); // idle | connecting | connected | error
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleJoin = async () => {
    const trimmed = roomInput.trim().toUpperCase();

    // Validation
    if (!trimmed) {
      setError('Please enter a Room ID.');
      triggerShake();
      return;
    }
    if (!socketService.constructor.validateRoomId(trimmed)) {
      setError('Invalid Room ID. Must be 4–8 uppercase letters or numbers.');
      triggerShake();
      return;
    }

    setError('');
    setConnectionState('connecting');

    try {
      // Connect socket (backend integration: replace with real socket.connect())
      await socketService.connect();
      setConnectionState('connected');

      // Small delay to show connected state
      await new Promise((r) => setTimeout(r, 600));

      // Emit JOIN_ROOM event (backend will respond with ROOM_STATE)
      socketService.emit('JOIN_ROOM', { roomId: trimmed, isHost: false });

      // Navigate to room
      navigate(`/room/${trimmed}`);
    } catch {
      setConnectionState('error');
      setError('Failed to connect. Make sure you are on the same network.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleJoin();
    // Auto-uppercase input
  };

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setRoomInput(val);
    if (error) setError('');
  };

  const isConnecting = connectionState === 'connecting';
  const statusMap = {
    idle: null,
    connecting: 'connecting',
    connected: 'connected',
    error: 'disconnected',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '80px',
        padding: '100px 24px 64px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: `
            radial-gradient(ellipse 70% 60% at 50% 40%, rgba(139,92,246,0.1) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 80% 80%, rgba(6,182,212,0.06) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '480px',
        }}
      >
        {/* Top icon */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))',
              border: '1px solid rgba(139,92,246,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 0 40px rgba(139,92,246,0.2)',
            }}
          >
            <Users size={34} color="var(--accent-purple-bright)" />
          </div>
          <h1 className="heading-md" style={{ marginBottom: '8px' }}>
            Join a Room
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>
            Enter the Room ID shared by your host to join the session.
          </p>
        </div>

        {/* Join card */}
        <div
          className="card card-elevated"
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Input */}
            <div>
              <label
                htmlFor="room-id-input"
                className="label"
                style={{ display: 'block', marginBottom: '10px' }}
              >
                Room ID
              </label>
              <input
                id="room-id-input"
                type="text"
                value={roomInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="e.g. ABC123"
                disabled={isConnecting}
                maxLength={8}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                className={`input input-mono ${error ? 'input-error' : ''}`}
                aria-describedby={error ? 'room-id-error' : undefined}
                aria-invalid={!!error}
                style={{
                  borderColor: shake ? '#ef4444' : undefined,
                }}
              />
              {error && (
                <div
                  id="room-id-error"
                  role="alert"
                  aria-live="assertive"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '8px',
                    color: '#f87171',
                    fontSize: '13px',
                  }}
                >
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
            </div>

            {/* Connection status */}
            {statusMap[connectionState] && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <ConnectionStatus status={statusMap[connectionState]} />
              </div>
            )}

            {/* Join button */}
            <button
              onClick={handleJoin}
              disabled={isConnecting}
              className="btn btn-primary w-full"
              id="join-room-btn"
              aria-label="Join the room"
              style={{ justifyContent: 'center', gap: '10px' }}
            >
              {isConnecting ? (
                <>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                    }}
                  />
                  Connecting…
                </>
              ) : (
                <>
                  Join Room
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Help text */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-faint)' }}>
            Make sure you are connected to the same Wi-Fi network as the host.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
            <Wifi size={14} color="var(--accent-cyan)" />
            <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 500, letterSpacing: '0.5px' }}>
              LOCAL NETWORK REQUIRED
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
