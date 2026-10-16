import * as roomService from '../services/roomService.js';

/**
 * Health check endpoint for UptimeRobot / ping monitoring.
 */
export function healthCheck(_req, res) {
  res.json({
    ok: true,
    service: 'play-together-unified',
    timestamp: Date.now(),
  });
}

/**
 * POST /api/rooms/create
 * Creates a new room.
 */
export function createRoom(req, res) {
  try {
    const requestedId = req.body?.roomId;
    const hostId = req.body?.hostId || 'host';

    const room = roomService.createRoom(requestedId, hostId);
    res.status(201).json({ success: true, roomId: room.id });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room.' });
  }
}

/**
 * GET /api/rooms/:roomId/exists
 * Validates room existence.
 */
export function checkRoomExists(req, res) {
  try {
    const { roomId } = req.params;
    const result = roomService.validateRoom(roomId);

    if (result.error) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Room validation error:', error);
    res.status(500).json({ valid: false, error: 'Failed to validate room.' });
  }
}
