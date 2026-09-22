import { io } from 'socket.io-client'

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || `http://${window.location.hostname}:3000`
const listeners = new Map()
let socket = null
let currentRoomId = null

function emit(event, data) {
  ;(listeners.get(event) || []).forEach((callback) => callback(data))
}

function mediaUrl(name) {
  return `${MEDIA_URL}/media/${encodeURIComponent(name)}`
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
    transports: ['websocket', 'polling'],
    auth: { roomId, isHost, name: participantName || 'Participant' },
  })

  socket.on('connect', () => emit('CONNECTION_STATUS', { status: 'connected' }))
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
    })
  })

  socket.on('MEDIA_SELECTED', ({ media }) => {
    emit('MEDIA_SELECTED', { media: { name: media, url: mediaUrl(media) } })
  })
  socket.on('PLAY', ({ position, serverTime }) => emit('PLAY', { position, serverTime }))
  socket.on('PLAY_CONFIRMED', ({ position }) => emit('PLAY', { position }))
  socket.on('PAUSE', ({ position }) => emit('PAUSE', { position }))
  socket.on('SEEK', ({ position }) => emit('SEEK', { position }))
  socket.on('PARTICIPANT_JOINED', (data) => emit('PARTICIPANT_JOINED', data))
  socket.on('PARTICIPANT_LEFT', (data) => emit('PARTICIPANT_LEFT', data))
  socket.on('CHAT_MESSAGE', (message) => emit('CHAT_MESSAGE', message))
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
export function sendMediaSelected(name) { socket?.emit('MEDIA_SELECTED', { media: name }) }
export function sendChatMessage(message, clientMessageId) {
  socket?.emit('CHAT_MESSAGE', { message, clientMessageId })
}

export default {
  on, off, connect, disconnect, leaveRoom, uploadMedia,
  sendPlay, sendPause, sendSeek, sendMediaSelected, sendChatMessage,
}
