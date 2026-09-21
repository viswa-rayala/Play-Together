/**
 * PLAY TOGETHER — Real Socket.io Service
 *
 * Connects to the Play Together Socket.io server.
 * Works on the same WiFi network — participants connect via the host's IP.
 *
 * Event Contract (unchanged from mock):
 *   Outgoing: JOIN_ROOM, LEAVE_ROOM, MEDIA_SELECTED, PLAY, PAUSE, SEEK
 *   Incoming: ROOM_STATE, PARTICIPANT_JOINED, PARTICIPANT_LEFT,
 *             HOST_DISCONNECTED, SYNC, MEDIA_CHUNK, MEDIA_READY
 */

import { io } from 'socket.io-client'

// Connect to the same host that served the page, port 3001.
// This works both for localhost dev and same-WiFi access (e.g. 192.168.0.207).
const SERVER_URL = `${window.location.protocol}//${window.location.hostname}:3001`

class SocketService {
  constructor() {
    this._socket = null
    this._connected = false
    this._roomId = null
    this._isHost = false
    this._currentFile = null // host keeps the File object for resends
  }

  // ─── Connection ──────────────────────────────────────────

  connect() {
    return new Promise((resolve, reject) => {
      this._socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        timeout: 8000,
      })

      const onConnect = () => {
        this._connected = true
        cleanup()
        resolve({ status: 'connected' })
      }

      const onError = (err) => {
        this._connected = false
        cleanup()
        reject(err)
      }

      const cleanup = () => {
        this._socket.off('connect', onConnect)
        this._socket.off('connect_error', onError)
      }

      this._socket.on('connect', onConnect)
      this._socket.on('connect_error', onError)

      // Listen for host resend requests
      this._socket.on('REQUEST_MEDIA_RESEND', ({ targetSocketId }) => {
        if (this._isHost && this._currentFile) {
          this._sendChunks(this._currentFile, null, targetSocketId)
        }
      })
    })
  }

  disconnect() {
    this._socket?.disconnect()
    this._socket = null
    this._connected = false
    this._roomId = null
    this._currentFile = null
  }

  get isConnected() {
    return this._connected
  }

  // ─── Event Emitter ────────────────────────────────────────

  on(event, callback) {
    this._socket?.on(event, callback)
    return () => this.off(event, callback)
  }

  off(event, callback) {
    this._socket?.off(event, callback)
  }

  // ─── Outgoing Events (Frontend → Server) ─────────────────

  emit(event, data = {}) {
    if (!this._socket) {
      console.warn('[Socket] Not connected. Cannot emit:', event)
      return
    }

    const roomId = this._roomId

    switch (event) {
      case 'JOIN_ROOM':
        this._roomId = data.roomId
        this._isHost = data.isHost ?? false
        this._socket.emit('JOIN_ROOM', { roomId: data.roomId, isHost: data.isHost })
        break

      case 'LEAVE_ROOM':
        this._socket.emit('LEAVE_ROOM', { roomId })
        this._roomId = null
        this._currentFile = null
        break

      case 'MEDIA_SELECTED': {
        // data = { name, url, mimeType, file }
        // Store file for potential resends; send chunks to all participants
        if (data.file) {
          this._currentFile = data.file
          this._sendChunks(data.file, null, null)
        }
        break
      }

      case 'PLAY':
        this._socket.emit('PLAY', { roomId, position: data.position })
        break

      case 'PAUSE':
        this._socket.emit('PAUSE', { roomId, position: data.position })
        break

      case 'SEEK':
        this._socket.emit('SEEK', { roomId, position: data.position, playing: data.playing ?? false })
        break

      default:
        console.log('[Socket] emit:', event, data)
    }
  }

  // ─── Restore a file reference (after page refresh from IndexedDB) ──
  // Sets the stored file so REQUEST_MEDIA_RESEND can work, without
  // re-transmitting to everyone (they already have it from before).
  restoreFile(file) {
    this._currentFile = file
  }

  // ─── Internal: chunk & send a File ────────────────────────

  async _sendChunks(file, onProgress, targetSocketId) {
    const CHUNK_SIZE = 128 * 1024 // 128 KB per chunk
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    const roomId = this._roomId

    for (let i = 0; i < totalChunks; i++) {
      if (!this._socket?.connected) break

      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const buffer = await file.slice(start, end).arrayBuffer()

      this._socket.emit('MEDIA_CHUNK', {
        roomId,
        chunk: buffer,
        chunkIndex: i,
        totalChunks,
        mimeType: file.type,
        fileName: file.name,
        targetSocketId: targetSocketId ?? undefined,
      })

      onProgress?.(Math.round(((i + 1) / totalChunks) * 100))

      // Small yield to keep UI responsive
      await new Promise((r) => setTimeout(r, 4))
    }

    this._socket?.emit('MEDIA_READY', {
      roomId,
      fileName: file.name,
      mimeType: file.type,
      targetSocketId: targetSocketId ?? undefined,
    })
  }

  // ─── Room Utilities ───────────────────────────────────────

  static generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
  }

  static validateRoomId(id) {
    return /^[A-Z0-9]{4,8}$/.test(id?.toUpperCase().trim())
  }
}

// Singleton instance
const socketService = new SocketService()
export default socketService
