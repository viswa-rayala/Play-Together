import { io } from 'socket.io-client'

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || 'https://playtogethr.vercel.app'
const listeners = new Map()
let socket = null
let currentRoomId = null
let serverOffset = 0
let clockSyncInterval = null

function emit(event, data) {
  ;(listeners.get(event) || []).forEach((callback) => callback(data))
}

function mediaUrl(name) {
  return `${MEDIA_URL}/media/${encodeURIComponent(name)}`
}

export function syncClock() {
  if (!socket || !socket.connected) return
  const t0 = Date.now()
  socket.emit('TIME_REQUEST')
  socket.once('TIME_RESPONSE', ({ serverTime }) => {
    const t1 = Date.now()
    const rtt = t1 - t0
    // NTP formula: offset = serverTime - (t0 + rtt / 2)
    serverOffset = Number(serverTime) - (t0 + rtt / 2)
  })
}

export function getServerTime() {
  return Date.now() + serverOffset
}

export function on(event, callback) {
  if (!listeners.has(event)) listeners.set(event, [])
  listeners.get(event).push(callback)
}

export function off(event, callback) {
  const callbacks = listeners.get(event) || []
  listeners.set(event, callbacks.filter((item) => item !== callback))
}

export function connect(roomId, isHost, participantName = 'Participant') {
  disconnect()
  currentRoomId = roomId
  emit('CONNECTION_STATUS', { status: 'connecting' })

  socket = io(MEDIA_URL, {
    transports: ['websocket'],
    auth: { roomId, isHost, name: participantName || 'Participant' },
  })

  socket.on('connect', () => {
    emit('CONNECTION_STATUS', { status: 'connected' })
    syncClock()
    if (clockSyncInterval) clearInterval(clockSyncInterval)
    clockSyncInterval = setInterval(syncClock, 10000)
  })
  socket.on('disconnect', () => emit('CONNECTION_STATUS', { status: 'disconnected' }))
  socket.on('connect_error', (error) => {
    console.error('Media server connection error:', error)
    emit('CONNECTION_STATUS', { status: 'error', message: 'Media server unavailable' })
  })

  socket.on('ROOM_STATE', (state) => {
    emit('ROOM_STATE', {
      messages: state.messages || [],
      participants: state.participants || [],
      media: state.media ? { name: state.media, url: mediaUrl(state.media) } : null,
      playback: {
        playing: Boolean(state.playing),
        position: Number(state.position) || 0,
      },
      serverTime: state.serverTime,
    })
  })

  socket.on('MEDIA_SELECTED', ({ media }) => {
    emit('MEDIA_SELECTED', { media: { name: media, url: mediaUrl(media) } })
  })
  socket.on('PLAY', ({ position, serverTime }) => emit('PLAY', { position, serverTime }))
  socket.on('PLAY_CONFIRMED', ({ position }) => emit('PLAY', { position }))
  socket.on('PAUSE', ({ position }) => emit('PAUSE', { position }))
  socket.on('SEEK', ({ position }) => emit('SEEK', { position }))
  socket.on('SYNC', ({ position, playing, serverTime }) => emit('SYNC', { position, playing, serverTime }))
  socket.on('PARTICIPANT_JOINED', (data) => emit('PARTICIPANT_JOINED', data))
  socket.on('PARTICIPANT_LEFT', (data) => emit('PARTICIPANT_LEFT', data))
  socket.on('CHAT_MESSAGE', (message) => emit('CHAT_MESSAGE', message))
  socket.on('MEET_PEERS', (data) => emit('MEET_PEERS', data))
  socket.on('MEET_PEER_JOINED', (peer) => emit('MEET_PEER_JOINED', peer))
  socket.on('MEET_PEER_LEFT', (peer) => emit('MEET_PEER_LEFT', peer))
  socket.on('MEET_SIGNAL', (data) => emit('MEET_SIGNAL', data))
  socket.on('MEET_ENDED', () => emit('MEET_ENDED'))
  socket.on('HOST_DISCONNECTED', () => emit('HOST_DISCONNECTED', {}))
}

export function uploadMedia(file, onProgress) {
  const formData = new FormData()
  formData.append('media', file)
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `${MEDIA_URL}/upload`)
    request.responseType = 'json'

    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    })
    request.addEventListener('load', () => {
      const data = request.response || {}
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(data.error || 'Media upload failed.'))
        return
      }
      onProgress?.(1)
      resolve({ name: data.media, url: mediaUrl(data.media) })
    })
    request.addEventListener('error', () => reject(new Error('Media upload failed.')))
    request.addEventListener('abort', () => reject(new Error('Media upload was cancelled.')))
    request.send(formData)
  })
}

export function disconnect() {
  if (clockSyncInterval) {
    clearInterval(clockSyncInterval)
    clockSyncInterval = null
  }
  if (socket) {
    socket.disconnect()
    socket = null
  }
  currentRoomId = null
}

export function leaveRoom() {
  if (socket) socket.emit('LEAVE_ROOM', { roomId: currentRoomId })
  disconnect()
}

export function sendPlay(position) { socket?.emit('PLAY', { position }) }
export function sendPause(position) { socket?.emit('PAUSE', { position }) }
export function sendSeek(position) { socket?.emit('SEEK', { position }) }
export function sendSync(position, playing) { socket?.emit('SYNC', { position, playing }) }
export function sendMediaSelected(name) { socket?.emit('MEDIA_SELECTED', { media: name }) }
export function sendChatMessage(message, clientMessageId) {
  socket?.emit('CHAT_MESSAGE', { message, clientMessageId })
}
export function sendMeetSignal(targetId, signal) {
  socket?.emit('MEET_SIGNAL', { targetId, signal })
}
export function sendMeetReady() { socket?.emit('MEET_READY') }
export function sendMeetEnd() { socket?.emit('MEET_END') }

export default {
  on, off, connect, disconnect, leaveRoom, uploadMedia,
  syncClock, getServerTime,
  sendPlay, sendPause, sendSeek, sendSync, sendMediaSelected, sendChatMessage, sendMeetSignal, sendMeetReady, sendMeetEnd,
}
