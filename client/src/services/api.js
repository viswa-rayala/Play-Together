const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`

async function request(path, options = {}) {
  let response

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    })
  } catch {
    throw new Error(`Cannot reach the backend at ${API_URL}. Start it with: npm --prefix server run dev`)
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

export async function createRoomRequest(roomId, hostId = 'host') {
  return request('/api/rooms/create', {
    method: 'POST',
    body: JSON.stringify({ roomId, hostId }),
  })
}

export async function validateRoomRequest(roomId) {
  return request(`/api/rooms/${encodeURIComponent(roomId)}/exists`)
}

export default {
  createRoomRequest,
  validateRoomRequest,
}
