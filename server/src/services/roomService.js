/**
 * Room Management Service
 * Handles state lifecycle for active rooms, participant roles, playback status, and chat messages.
 */

export const inMemoryRooms = new Map();
export const roomStates = new Map();
export const hostIds = new Map();

/**
 * Normalizes a Room ID into standard alphanumeric uppercase string.
 */
export function normalizeRoomId(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Generates a clean 6-character alphanumeric room ID.
 */
export function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i += 1) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Retrieves or initializes state for a given room.
 */
export function getRoomState(roomId) {
  if (!roomStates.has(roomId)) {
    roomStates.set(roomId, {
      media: '',
      playlist: [],
      controllers: [],
      position: 0,
      playing: false,
      updatedAt: Date.now(),
      participants: [],
      messages: [],
    });
  }
  return roomStates.get(roomId);
}

/**
 * Checks if a socket has permission to control playback (Host or delegated Co-Host).
 */
export function canControl(roomId, socketId) {
  const hostId = hostIds.get(roomId);
  if (socketId === hostId) return true;
  const roomState = getRoomState(roomId);
  return Array.isArray(roomState.controllers) && roomState.controllers.includes(socketId);
}

/**
 * Calculates real-time playback position accounting for elapsed time if actively playing.
 */
export function getCurrentPosition(roomState) {
  if (!roomState.playing) {
    return roomState.position;
  }
  const elapsed = (Date.now() - roomState.updatedAt) / 1000;
  return roomState.position + elapsed;
}

/**
 * Removes a participant from room state and controller delegations.
 */
export function removeParticipant(roomState, socketId) {
  roomState.participants = roomState.participants.filter(
    (participant) => participant.id !== socketId
  );
  if (Array.isArray(roomState.controllers)) {
    roomState.controllers = roomState.controllers.filter((id) => id !== socketId);
  }
}

/**
 * Cleans up and resets all room state when the session terminates.
 */
export function endRoom(roomId, roomState) {
  roomState.playing = false;
  roomState.position = 0;
  roomState.media = '';
  roomState.playlist = [];
  roomState.controllers = [];
  roomState.updatedAt = Date.now();
  roomState.participants = [];
  roomState.messages = [];
  hostIds.delete(roomId);
  inMemoryRooms.delete(roomId);
}

/**
 * Formats participant list including host authority flag.
 */
export function getParticipantsWithRole(roomId) {
  const activeHost = hostIds.get(roomId);
  const roomState = getRoomState(roomId);
  return roomState.participants.map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.id === activeHost,
  }));
}

/**
 * Creates a new room in memory.
 */
export function createRoom(requestedId, hostId = 'host') {
  let roomId = normalizeRoomId(requestedId);
  if (!roomId) {
    roomId = generateRoomId();
  }

  if (!/^[A-Z0-9]{4,10}$/.test(roomId)) {
    throw { status: 400, message: 'Invalid room ID format.' };
  }

  if (inMemoryRooms.has(roomId) || roomStates.has(roomId)) {
    throw { status: 409, message: 'Room ID already exists.' };
  }

  const roomData = {
    id: roomId,
    host_id: hostId,
    is_active: true,
    participant_count: 1,
    createdAt: Date.now(),
  };

  inMemoryRooms.set(roomId, roomData);
  return roomData;
}

/**
 * Validates whether a room exists and is currently active.
 */
export function validateRoom(requestedId) {
  const roomId = normalizeRoomId(requestedId);

  if (!/^[A-Z0-9]{4,10}$/.test(roomId)) {
    return { valid: false, error: 'Invalid room ID format.' };
  }

  const roomData = inMemoryRooms.get(roomId);
  const hasSocketRoom = roomStates.has(roomId);
  const isValid = (roomData && roomData.is_active) || hasSocketRoom;

  return {
    valid: Boolean(isValid),
    exists: Boolean(roomData || hasSocketRoom),
  };
}
