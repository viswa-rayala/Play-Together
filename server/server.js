import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 200e6,
})

// ── In-memory rooms ──────────────────────────────────────────
const rooms = new Map()
const HOST_GRACE_MS = 10_000

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'play-together-server', rooms: rooms.size })
})

io.on('connection', (socket) => {
  let currentRoom = null
  let currentIsHost = false

  socket.on('JOIN_ROOM', ({ roomId, isHost }) => {
    currentRoom = roomId
    currentIsHost = isHost
    socket.join(roomId)

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        hostSocketId: null,
        participants: new Set(),
        media: null,
        playback: { playing: false, position: 0 },
        hostReconnectTimer: null,
      })
    }

    const room = rooms.get(roomId)
    room.participants.add(socket.id)

    if (isHost) {
      if (room.hostReconnectTimer) {
        clearTimeout(room.hostReconnectTimer)
        room.hostReconnectTimer = null
        console.log(`[Room ${roomId}] Host reconnected — grace timer cancelled`)
        socket.to(roomId).emit('HOST_RECONNECTED')
      }
      room.hostSocketId = socket.id
    }

    const participantCount = room.hostSocketId
      ? Math.max(0, room.participants.size - 1)
      : room.participants.size

    socket.emit('ROOM_STATE', {
      roomId,
      isHost,
      participants: participantCount,
      media: room.media,
      playback: room.playback,
    })

    socket.to(roomId).emit('PARTICIPANT_JOINED', { count: participantCount })

    if (!isHost && room.media && room.hostSocketId) {
      io.to(room.hostSocketId).emit('REQUEST_MEDIA_RESEND', {
        targetSocketId: socket.id,
      })
    }
  })

  socket.on('MEDIA_CHUNK', ({ roomId, chunk, chunkIndex, totalChunks, mimeType, fileName, targetSocketId }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit('MEDIA_CHUNK', { chunk, chunkIndex, totalChunks, mimeType, fileName })
    } else {
      socket.to(roomId).emit('MEDIA_CHUNK', { chunk, chunkIndex, totalChunks, mimeType, fileName })
    }
  })

  socket.on('MEDIA_READY', ({ roomId, fileName, mimeType, targetSocketId }) => {
    const room = rooms.get(roomId)
    if (room) {
      room.media = { name: fileName, mimeType }
      room.playback = { playing: false, position: 0 }
    }
    if (targetSocketId) {
      io.to(targetSocketId).emit('MEDIA_READY', { fileName, mimeType })
    } else {
      socket.to(roomId).emit('MEDIA_READY', { fileName, mimeType })
    }
  })

  socket.on('PLAY', ({ roomId, position }) => {
    const room = rooms.get(roomId)
    if (room) room.playback = { playing: true, position }
    socket.to(roomId).emit('SYNC', { position, playing: true, timestamp: Date.now() })
  })

  socket.on('PAUSE', ({ roomId, position }) => {
    const room = rooms.get(roomId)
    if (room) room.playback = { playing: false, position }
    socket.to(roomId).emit('SYNC', { position, playing: false, timestamp: Date.now() })
  })

  socket.on('SEEK', ({ roomId, position, playing }) => {
    const room = rooms.get(roomId)
    if (room) room.playback = { playing: playing ?? false, position }
    socket.to(roomId).emit('SYNC', { position, playing: playing ?? false, timestamp: Date.now() })
  })

  socket.on('LEAVE_ROOM', ({ roomId }) => {
    handleLeave(socket, roomId)
  })

  socket.on('disconnect', (reason) => {
    if (!currentRoom) return
    const room = rooms.get(currentRoom)
    if (!room) return

    room.participants.delete(socket.id)

    if (currentIsHost || room.hostSocketId === socket.id) {
      room.hostSocketId = null
      console.log(`[Room ${currentRoom}] Host disconnected (${reason}). Grace: ${HOST_GRACE_MS}ms`)
      io.to(currentRoom).emit('HOST_RECONNECTING', { graceMs: HOST_GRACE_MS })

      room.hostReconnectTimer = setTimeout(() => {
        if (rooms.has(currentRoom)) {
          console.log(`[Room ${currentRoom}] Grace expired. Ending session.`)
          io.to(currentRoom).emit('HOST_DISCONNECTED')
          rooms.delete(currentRoom)
        }
      }, HOST_GRACE_MS)
    } else {
      if (room.participants.size === 0) {
        rooms.delete(currentRoom)
      } else {
        const count = room.hostSocketId
          ? Math.max(0, room.participants.size - 1)
          : room.participants.size
        socket.to(currentRoom).emit('PARTICIPANT_LEFT', { count })
      }
    }
  })

  function handleLeave(socket, roomId) {
    socket.leave(roomId)
    const room = rooms.get(roomId)
    if (!room) return
    room.participants.delete(socket.id)
    if (room.participants.size === 0) {
      rooms.delete(roomId)
    } else {
      const count = room.hostSocketId
        ? Math.max(0, room.participants.size - 1)
        : room.participants.size
      socket.to(roomId).emit('PARTICIPANT_LEFT', { count })
    }
  }
})

const port = Number(process.env.PORT || 3001)
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`✅ Play Together server running on http://0.0.0.0:${port}`)
})
