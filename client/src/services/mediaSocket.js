import { io } from 'socket.io-client'

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || `http://${window.location.hostname}:3000`
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

let isCalibrating = false
let calibrated = false

/**
 * Multi-sample NTP clock synchronization with outlier rejection (Beatsync style).
 * Sends a burst of ping packets to calculate Round-Trip-Time (RTT) and clock offset.
 * Discards high-RTT outliers and calculates a robust average from the lowest-latency samples.
 */
export function syncClock(burstCount = 6) {
  if (!socket || !socket.connected || isCalibrating) return
  isCalibrating = true

  const samples = []
  let pingIndex = 0

  const onResponse = (payload) => {
    const t1 = Date.now()
    const sendTime = payload?.clientTime ?? (t1 - 10)
    const serverTime = Number(payload?.serverTime) || t1
    const rtt = Math.max(1, t1 - sendTime)

    // Standard NTP clock offset formula: serverTime - (clientTime + rtt / 2)
    const offset = serverTime - (sendTime + rtt / 2)
    samples.push({ rtt, offset })

    pingIndex++
    if (pingIndex < burstCount) {
      setTimeout(sendPing, 35)
    } else {
      finishCalibration()
    }
  }

  const sendPing = () => {
    if (!socket || !socket.connected) {
      finishCalibration()
      return
    }
    const t0 = Date.now()
    socket.emit('TIME_REQUEST', { clientTime: t0 })
  }

  const finishCalibration = () => {
    if (socket) {
      socket.off('TIME_RESPONSE', onResponse)
    }
    isCalibrating = false

    if (samples.length === 0) return

    // Sort by lowest RTT (samples with minimal network buffering and asymmetry)
    samples.sort((a, b) => a.rtt - b.rtt)

    // Select the best 50% lowest-latency samples (minimum 1)
    const bestCount = Math.max(1, Math.floor(samples.length / 2))
    const bestSamples = samples.slice(0, bestCount)
    const burstAvgOffset = bestSamples.reduce((acc, s) => acc + s.offset, 0) / bestSamples.length

    if (!calibrated) {
      serverOffset = burstAvgOffset
      calibrated = true
    } else {
      // Exponential moving average: smooth transition without sudden playback jumps
      serverOffset = (serverOffset * 0.65) + (burstAvgOffset * 0.35)
    }
  }

  socket.on('TIME_RESPONSE', onResponse)
  sendPing()
}

export function getServerTime() {
  return Date.now() + serverOffset
}

export function getServerOffset() {
  return serverOffset
}

export function isConnected() {
  return Boolean(socket && socket.connected)
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
    syncClock(8) // Initial high-accuracy 8-ping burst
    if (clockSyncInterval) clearInterval(clockSyncInterval)
    clockSyncInterval = setInterval(() => syncClock(4), 8000) // Periodic EMA tracking
  })
  socket.on('disconnect', () => emit('CONNECTION_STATUS', { status: 'disconnected' }))
  socket.on('connect_error', (error) => {
    console.error('Media server connection error:', error)
    emit('CONNECTION_STATUS', { status: 'error', message: 'Media server unavailable' })
  })

  socket.on('ROOM_STATE', (state) => {
    emit('ROOM_STATE', {
      messages: state.messages || [],
      participants: (state.participants || []).map((p) => ({
        ...p,
        isHost: Boolean(p.isHost || (state.hostId && p.id === state.hostId)),
      })),
      hostId: state.hostId || null,
      media: state.media ? { name: state.media, url: mediaUrl(state.media) } : null,
      playlist: (state.playlist || []).map((item) => ({ name: item, url: mediaUrl(item) })),
      controllers: state.controllers || [],
      playback: {
        playing: Boolean(state.playing),
        position: Number(state.position) || 0,
      },
      serverTime: state.serverTime,
      isHost: Boolean(state.isHost),
      hasControl: Boolean(state.hasControl),
      myId: state.myId || socket.id,
    })
  })

  socket.on('MEDIA_SELECTED', ({ media, playlist }) => {
    emit('MEDIA_SELECTED', {
      media: media ? { name: media, url: mediaUrl(media) } : null,
      playlist: (playlist || []).map((item) => ({ name: item, url: mediaUrl(item) })),
    })
  })
  socket.on('PLAYLIST_UPDATED', ({ playlist, media }) => {
    emit('PLAYLIST_UPDATED', {
      media: media ? { name: media, url: mediaUrl(media) } : null,
      playlist: (playlist || []).map((item) => ({ name: item, url: mediaUrl(item) })),
    })
  })
  socket.on('CONTROLLERS_UPDATED', ({ controllers }) => {
    emit('CONTROLLERS_UPDATED', { controllers: controllers || [] })
  })
  socket.on('PLAY', (data) => emit('PLAY', data))
  socket.on('PLAY_CONFIRMED', (data) => emit('PLAY', data))
  socket.on('PAUSE', (data) => emit('PAUSE', data))
  socket.on('SEEK', (data) => emit('SEEK', data))
  socket.on('SEEK_CONFIRMED', (data) => emit('SEEK', data))
  socket.on('SYNC', (data) => emit('SYNC', data))
  socket.on('PARTICIPANT_JOINED', (data) => emit('PARTICIPANT_JOINED', data))
  socket.on('PARTICIPANT_LEFT', (data) => emit('PARTICIPANT_LEFT', data))
  socket.on('CHAT_MESSAGE', (message) => emit('CHAT_MESSAGE', message))
  socket.on('MEET_PEERS', (data) => emit('MEET_PEERS', data))
  socket.on('MEET_PEER_JOINED', (peer) => emit('MEET_PEER_JOINED', peer))
  socket.on('MEET_PEER_LEFT', (peer) => emit('MEET_PEER_LEFT', peer))
  socket.on('MEET_SIGNAL', (data) => emit('MEET_SIGNAL', data))
  socket.on('MEET_ENDED', () => emit('MEET_ENDED'))
  socket.on('HOST_DISCONNECTED', () => emit('HOST_DISCONNECTED', {}))
  socket.on('HOST_CHANGED', (data) => emit('HOST_CHANGED', data))
  socket.on('ROLE', (data) => emit('ROLE', data))
  socket.on('KICKED', (data) => emit('KICKED', data))
  socket.on('CONTROL_DENIED', (data) => emit('CONTROL_DENIED', data))
}

export function uploadMedia(fileOrFiles, onProgress) {
  const formData = new FormData()
  const files = Array.isArray(fileOrFiles)
    ? fileOrFiles
    : (fileOrFiles instanceof FileList ? Array.from(fileOrFiles) : [fileOrFiles])

  files.filter(Boolean).forEach((file) => {
    formData.append('media', file)
  })

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
      const primaryMedia = data.media || (Array.isArray(data.files) ? data.files[0] : null)
      const uploadedFiles = (data.files || (primaryMedia ? [primaryMedia] : [])).map((item) => ({
        name: item,
        url: mediaUrl(item),
      }))
      resolve({
        name: primaryMedia,
        url: primaryMedia ? mediaUrl(primaryMedia) : '',
        files: uploadedFiles,
      })
    })
    request.addEventListener('error', () => reject(new Error('Media upload failed.')))
    request.addEventListener('abort', () => reject(new Error('Media upload was cancelled.')))
    request.send(formData)
  })
}

export function getMyId() {
  return socket?.id || null
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
export function sendPlaylistUpdate(playlist) { socket?.emit('PLAYLIST_UPDATE', { playlist }) }
export function sendAddToPlaylist(items, selectFirst = false) {
  socket?.emit('ADD_TO_PLAYLIST', { items: Array.isArray(items) ? items : [items], selectFirst })
}
export function sendRemoveFromPlaylist(name) { socket?.emit('REMOVE_FROM_PLAYLIST', { name }) }
export function sendToggleControl(targetId, grant) { socket?.emit('TOGGLE_CONTROL', { targetId, grant }) }
export function removeParticipant(targetId) { socket?.emit('REMOVE_PARTICIPANT', { targetId }) }
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
  syncClock, getServerTime, getServerOffset, isConnected, getMyId,
  sendPlay, sendPause, sendSeek, sendSync, sendMediaSelected,
  sendPlaylistUpdate, sendAddToPlaylist, sendRemoveFromPlaylist, sendToggleControl,
  removeParticipant, sendChatMessage, sendMeetSignal, sendMeetReady, sendMeetEnd,
}
