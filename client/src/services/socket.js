/**
 * services/socket.js  —  MOCK WebSocket Service
 * ════════════════════════════════════════════════════════════════════════════
 * Simulates a real WebSocket server in-memory so the UI is fully demo-able
 * without a backend.
 *
 * ── HOW TO REPLACE WITH A REAL BACKEND (for Person 2 / Person 3) ──────────
 * 1. Open a real WebSocket:  const ws = new WebSocket('ws://<server>:<port>')
 * 2. In connect():           ws.onopen → emit CONNECTION_STATUS connected
 * 3. In ws.onmessage:        parse JSON → _emit(data.type, data)
 * 4. In sendPlay/Pause/Seek: ws.send(JSON.stringify({ type, ... }))
 * 5. Keep the on() / off() / _emit() wiring exactly as-is.
 *
 * ── Backend event names (DO NOT RENAME) ──────────────────────────────────
 * JOIN_ROOM, LEAVE_ROOM, ROOM_STATE, MEDIA_SELECTED,
 * PLAY, PAUSE, SEEK, SYNC, PARTICIPANT_JOINED, PARTICIPANT_LEFT,
 * HOST_DISCONNECTED
 */

// ── Event Emitter ─────────────────────────────────────────────────────────
const _listeners = {}

export function on(event, cb) {
  if (!_listeners[event]) _listeners[event] = []
  _listeners[event].push(cb)
}

export function off(event, cb) {
  if (!_listeners[event]) return
  _listeners[event] = _listeners[event].filter((fn) => fn !== cb)
}

function _emit(event, data) {
  ;(_listeners[event] || []).forEach((cb) => cb(data))
}

// ── Internal State ────────────────────────────────────────────────────────
const _default = {
  roomId:       null,
  isHost:       false,
  participants: [],   // Array of { id: string, name: string }
  media:        null,
  playback:     { playing: false, position: 0 },
}

let _state   = { ..._default }
let _timers  = []   // track setTimeout IDs so we can cancel on disconnect

// ── Helpers ───────────────────────────────────────────────────────────────
function _makeId() {
  return Math.random().toString(36).substring(2, 7).toUpperCase()
}

// ── Connection ────────────────────────────────────────────────────────────
export function connect(roomId, isHost) {
  _clearTimers()
  _emit('CONNECTION_STATUS', { status: 'connecting' })

  const t = setTimeout(() => {
    // Host starts with an empty room; joining participants start as themselves
    const initList = isHost
      ? []
      : [{ id: _makeId(), name: 'You (Guest)' }]

    _state = {
      roomId, isHost,
      participants: initList,
      media:    null,
      playback: { playing: false, position: 0 },
    }

    _emit('CONNECTION_STATUS', { status: 'connected' })
    _emit('ROOM_STATE', { ..._state })

    // ── Mock: simulate 2 named guests joining after a delay ──────────────
    if (isHost) {
      const mockGuests = [
        { id: _makeId(), name: 'Alice' },
        { id: _makeId(), name: 'Bob'   },
      ]
      _timers.push(
        setTimeout(() => {
          _state.participants = [..._state.participants, mockGuests[0]]
          _emit('PARTICIPANT_JOINED', { participants: _state.participants })
        }, 4000),
        setTimeout(() => {
          _state.participants = [..._state.participants, mockGuests[1]]
          _emit('PARTICIPANT_JOINED', { participants: _state.participants })
        }, 9000),
      )
    }
  }, 900)

  _timers.push(t)
}

export function disconnect() {
  _clearTimers()
  _state = { ..._default }
  _emit('CONNECTION_STATUS', { status: 'disconnected' })
}

/**
 * leaveRoom — signals the server before disconnecting.
 * Real backend: ws.send(JSON.stringify({ type: 'LEAVE_ROOM', roomId: _state.roomId }))
 */
export function leaveRoom() {
  _emit('LEAVE_ROOM', { roomId: _state.roomId })
  disconnect()
}

function _clearTimers() {
  _timers.forEach(clearTimeout)
  _timers = []
}

// ── Room actions ──────────────────────────────────────────────────────────
export function createRoom(roomId) { connect(roomId, true) }
export function joinRoom(roomId)   { connect(roomId, false) }

/**
 * addParticipant — mock add.
 * Real backend: ws.send({ type: 'ADD_PARTICIPANT', name })
 */
export function addParticipant(name) {
  const trimmed = name.trim()
  if (!trimmed) return
  const newP = { id: _makeId(), name: trimmed }
  _state.participants = [..._state.participants, newP]
  _emit('PARTICIPANT_JOINED', { participants: _state.participants })
}

/**
 * removeParticipant — mock remove.
 * Real backend: ws.send({ type: 'REMOVE_PARTICIPANT', id })
 */
export function removeParticipant(id) {
  _state.participants = _state.participants.filter((p) => p.id !== id)
  _emit('PARTICIPANT_LEFT', { participants: _state.participants })
}

// ── Playback ──────────────────────────────────────────────────────────────
export function sendPlay(position) {
  _state.playback = { playing: true, position }
  // Real backend: ws.send(JSON.stringify({ type: 'PLAY', position, timestamp: Date.now() }))
  _emit('PLAY', { type: 'PLAY', position, timestamp: Date.now() })
}

export function sendPause(position) {
  _state.playback = { playing: false, position }
  // Real backend: ws.send(JSON.stringify({ type: 'PAUSE', position }))
  _emit('PAUSE', { type: 'PAUSE', position })
}

export function sendSeek(position) {
  _state.playback = { ..._state.playback, position }
  // Real backend: ws.send(JSON.stringify({ type: 'SEEK', position }))
  _emit('SEEK', { type: 'SEEK', position })
}

export function sendMediaSelected(name, url) {
  _state.media = { name, url }
  // Real backend: ws.send(JSON.stringify({ type: 'MEDIA_SELECTED', media: { name, url } }))
  _emit('MEDIA_SELECTED', { type: 'MEDIA_SELECTED', media: { name, url } })
}

// ── Utilities ─────────────────────────────────────────────────────────────
export function getState() { return { ..._state } }

// Default export: single object for easy import everywhere
const socketService = {
  on, off, connect, disconnect, leaveRoom,
  createRoom, joinRoom,
  addParticipant, removeParticipant,
  sendPlay, sendPause, sendSeek, sendMediaSelected,
  getState,
}

export default socketService
