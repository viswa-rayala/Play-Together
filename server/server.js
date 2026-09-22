import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 3001)

// In-memory store for rooms to bypass Supabase dependency
const inMemoryRooms = new Map()
app.use(cors())
app.use(express.json())

function normalizeRoomId(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 6; i += 1) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'play-together-server' })
})

app.post('/api/rooms/create', async (req, res) => {
  try {
    let roomId = normalizeRoomId(req.body?.roomId)
    const hostId = String(req.body?.hostId || 'host')

    if (!roomId) {
      roomId = generateRoomId()
    }

    if (!/^[A-Z0-9]{4,10}$/.test(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID format.' })
    }

    if (inMemoryRooms.has(roomId)) {
      return res.status(409).json({ error: 'Room ID already exists.' })
    }

    inMemoryRooms.set(roomId, {
      id: roomId,
      host_id: hostId,
      is_active: true,
      participant_count: 1,
    })

    res.status(201).json({ success: true, roomId })
  } catch (error) {
    console.error('Create room error:', error)
    res.status(500).json({ error: 'Failed to create room.' })
  }
})

app.get('/api/rooms/:roomId/exists', async (req, res) => {
  try {
    const roomId = normalizeRoomId(req.params.roomId)

    if (!/^[A-Z0-9]{4,10}$/.test(roomId)) {
      return res.status(400).json({ valid: false, error: 'Invalid room ID format.' })
    }

    const data = inMemoryRooms.get(roomId)

    res.json({ valid: !!data && data.is_active, exists: !!data })
  } catch (error) {
    console.error('Room validation error:', error)
    res.status(500).json({ valid: false, error: 'Failed to validate room.' })
  }
})

app.listen(port, () => {
  console.log(`Play Together server running on http://localhost:${port}`)
})
