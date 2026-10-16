import * as roomService from '../services/roomService.js';
import { SCHEDULE_PLAY_LEAD_MS, SCHEDULE_SEEK_LEAD_MS } from '../config/index.js';

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    const roomId = String(socket.handshake.auth?.roomId || 'default');
    const roomState = roomService.getRoomState(roomId);
    const participantName =
      String(socket.handshake.auth?.name || 'Participant').trim() || 'Participant';

    let currentHostId = roomService.hostIds.get(roomId) || null;

    // Check if the registered host is still actively connected in socket.io
    if (currentHostId && !io.sockets.sockets.has(currentHostId)) {
      currentHostId = null;
      roomService.hostIds.delete(roomId);
    }

    if (!currentHostId) {
      currentHostId = socket.id;
      roomService.hostIds.set(roomId, currentHostId);
      console.log('Host assigned:', currentHostId, 'Room:', roomId, 'Name:', participantName);
    } else if (socket.handshake.auth?.isHost === true && currentHostId !== socket.id) {
      console.log(
        `Client ${socket.id} (${participantName}) joined with isHost=true, but room ${roomId} already has host ${currentHostId}. Denying host privileges.`
      );
    }

    socket.join(roomId);
    roomState.participants.push({ id: socket.id, name: participantName });

    console.log(
      'Client connected:',
      socket.id,
      'Room:',
      roomId,
      'Name:',
      participantName
    );

    // Initial state sent to joining socket
    socket.emit('ROOM_STATE', {
      media: roomState.media,
      playlist: roomState.playlist || [],
      controllers: roomState.controllers || [],
      messages: roomState.messages,
      position: roomService.getCurrentPosition(roomState),
      playing: roomState.playing,
      serverTime: Date.now(),
      isHost: socket.id === currentHostId,
      hostId: currentHostId,
      hasControl: roomService.canControl(roomId, socket.id),
      myId: socket.id,
      participants: roomService.getParticipantsWithRole(roomId),
    });

    // Notify room of joined participant
    io.to(roomId).emit('PARTICIPANT_JOINED', {
      participants: roomService.getParticipantsWithRole(roomId),
      hostId: currentHostId,
    });

    // WebRTC Meet peer discovery
    socket.emit('MEET_PEERS', {
      peers: roomState.participants
        .filter((participant) => participant.id !== socket.id)
        .map((participant) => ({ id: participant.id, name: participant.name })),
    });

    socket.to(roomId).emit('MEET_PEER_JOINED', {
      id: socket.id,
      name: participantName,
    });

    socket.emit('ROLE', {
      isHost: socket.id === currentHostId,
    });

    // Multi-sample NTP clock synchronization
    socket.on('TIME_REQUEST', (data) => {
      socket.emit('TIME_RESPONSE', {
        serverTime: Date.now(),
        clientTime: data?.clientTime,
      });
    });

    // In-room chat messaging
    socket.on('CHAT_MESSAGE', (data) => {
      const message = String(data?.message || '').trim().slice(0, 500);
      if (!message) return;

      const chatMessage = {
        id: String(data?.clientMessageId || `${socket.id}-${Date.now()}`),
        name: participantName,
        message,
        sentAt: Date.now(),
      };

      roomState.messages.push(chatMessage);
      if (roomState.messages.length > 100) {
        roomState.messages.shift();
      }

      io.to(roomId).emit('CHAT_MESSAGE', chatMessage);
    });

    // WebRTC signaling
    socket.on('MEET_SIGNAL', (data) => {
      const targetId = String(data?.targetId || '');
      if (!targetId || !data?.signal) return;

      io.to(targetId).emit('MEET_SIGNAL', {
        senderId: socket.id,
        senderName: participantName,
        signal: data.signal,
      });
    });

    socket.on('MEET_READY', () => {
      socket.emit('MEET_PEERS', {
        peers: roomState.participants
          .filter((participant) => participant.id !== socket.id)
          .map((participant) => ({ id: participant.id, name: participant.name })),
      });
    });

    socket.on('MEET_END', () => {
      if (socket.id === roomService.hostIds.get(roomId)) {
        io.to(roomId).emit('MEET_ENDED');
      }
    });

    // Control delegation (Host only)
    socket.on('TOGGLE_CONTROL', (data) => {
      const currentHost = roomService.hostIds.get(roomId);
      if (socket.id !== currentHost) return;
      const targetId = String(data?.targetId || '');
      if (!targetId || targetId === currentHost) return;

      if (!Array.isArray(roomState.controllers)) {
        roomState.controllers = [];
      }

      const isCurrentlyController = roomState.controllers.includes(targetId);
      const shouldGrant =
        data?.grant !== undefined ? Boolean(data.grant) : !isCurrentlyController;

      if (shouldGrant) {
        if (!isCurrentlyController) roomState.controllers.push(targetId);
      } else {
        roomState.controllers = roomState.controllers.filter((id) => id !== targetId);
      }

      console.log(`Controllers updated in room ${roomId}:`, roomState.controllers);
      io.to(roomId).emit('CONTROLLERS_UPDATED', {
        controllers: roomState.controllers,
      });
    });

    // Remove / Kick participant (Host only)
    socket.on('REMOVE_PARTICIPANT', (data) => {
      const currentHost = roomService.hostIds.get(roomId);
      if (socket.id !== currentHost) {
        socket.emit('CONTROL_DENIED', { message: 'Only the Host can remove participants.' });
        return;
      }
      const targetId = String(data?.targetId || '').trim();
      if (!targetId || targetId === currentHost) return;

      console.log(`Host ${socket.id} removing participant ${targetId} from room ${roomId}`);

      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.emit('KICKED', {
          reason: 'You were removed from the room by the Host.',
        });
        targetSocket.leave(roomId);
      }

      roomService.removeParticipant(roomState, targetId);
      const updatedParticipants = roomService.getParticipantsWithRole(roomId);

      io.to(roomId).emit('PARTICIPANT_LEFT', {
        participants: updatedParticipants,
        hostId: currentHost,
        removedId: targetId,
      });
      io.to(roomId).emit('MEET_PEER_LEFT', { id: targetId });
      io.to(roomId).emit('CONTROLLERS_UPDATED', {
        controllers: roomState.controllers,
      });
    });

    // Media selection
    socket.on('MEDIA_SELECTED', (data) => {
      if (!roomService.canControl(roomId, socket.id)) return;

      const selected = String(data?.media || '').trim();
      console.log('MEDIA_SELECTED:', selected);

      roomState.media = selected;
      if (selected && !roomState.playlist.includes(selected)) {
        roomState.playlist.push(selected);
      }

      roomState.position = 0;
      roomState.playing = false;
      roomState.updatedAt = Date.now();

      io.to(roomId).emit('MEDIA_SELECTED', {
        media: roomState.media,
        playlist: roomState.playlist,
      });
    });

    // Playlist update
    socket.on('PLAYLIST_UPDATE', (data) => {
      if (!roomService.canControl(roomId, socket.id)) return;
      if (Array.isArray(data?.playlist)) {
        roomState.playlist = data.playlist.map((item) => String(item).trim()).filter(Boolean);
        if (!roomState.media && roomState.playlist.length > 0) {
          roomState.media = roomState.playlist[0];
          roomState.position = 0;
          roomState.playing = false;
          roomState.updatedAt = Date.now();
        }
        io.to(roomId).emit('PLAYLIST_UPDATED', {
          playlist: roomState.playlist,
          media: roomState.media,
        });
      }
    });

    // Add to playlist
    socket.on('ADD_TO_PLAYLIST', (data) => {
      if (!roomService.canControl(roomId, socket.id)) return;
      const newItems = Array.isArray(data?.items) ? data.items : data?.item ? [data.item] : [];
      let changed = false;

      for (const item of newItems) {
        const name = String(item).trim();
        if (name && !roomState.playlist.includes(name)) {
          roomState.playlist.push(name);
          changed = true;
        }
      }

      if (!roomState.media && roomState.playlist.length > 0) {
        roomState.media = roomState.playlist[0];
        roomState.position = 0;
        roomState.playing = false;
        roomState.updatedAt = Date.now();
        changed = true;
      }

      if (changed || data?.selectFirst) {
        if (data?.selectFirst && newItems.length > 0) {
          roomState.media = String(newItems[0]).trim();
          roomState.position = 0;
          roomState.playing = false;
          roomState.updatedAt = Date.now();
        }
        io.to(roomId).emit('PLAYLIST_UPDATED', {
          playlist: roomState.playlist,
          media: roomState.media,
        });
      }
    });

    // Remove from playlist
    socket.on('REMOVE_FROM_PLAYLIST', (data) => {
      if (!roomService.canControl(roomId, socket.id)) return;
      const name = String(data?.name || '').trim();
      roomState.playlist = roomState.playlist.filter((item) => item !== name);

      if (roomState.media === name) {
        roomState.media = roomState.playlist.length > 0 ? roomState.playlist[0] : '';
        roomState.position = 0;
        roomState.playing = false;
        roomState.updatedAt = Date.now();
      }

      io.to(roomId).emit('PLAYLIST_UPDATED', {
        playlist: roomState.playlist,
        media: roomState.media,
      });
    });

    // Play with Beatsync future-scheduled timestamp
    socket.on('PLAY', (data) => {
      if (!roomService.canControl(roomId, socket.id)) return;

      roomState.position = Number(data.position) || 0;
      roomState.playing = true;
      roomState.updatedAt = Date.now();

      const scheduledAt = roomState.updatedAt + SCHEDULE_PLAY_LEAD_MS;

      socket.to(roomId).emit('PLAY', {
        position: roomState.position,
        serverTime: roomState.updatedAt,
        scheduledAt,
      });

      socket.emit('PLAY_CONFIRMED', {
        position: roomState.position,
        serverTime: roomState.updatedAt,
        scheduledAt,
      });
    });

    // Pause
    socket.on('PAUSE', (data) => {
      if (!roomService.canControl(roomId, socket.id)) return;

      roomState.position = Number(data.position) || 0;
      roomState.playing = false;
      roomState.updatedAt = Date.now();

      socket.to(roomId).emit('PAUSE', {
        position: roomState.position,
      });
    });

    // Seek with lead time for synchronized audio/video re-cue
    socket.on('SEEK', (data) => {
      if (!roomService.canControl(roomId, socket.id)) return;

      roomState.position = Number(data.position) || 0;
      roomState.updatedAt = Date.now();

      const leadMs = roomState.playing ? SCHEDULE_SEEK_LEAD_MS : 0;
      const scheduledAt = roomState.updatedAt + leadMs;

      socket.to(roomId).emit('SEEK', {
        position: roomState.position,
        serverTime: roomState.updatedAt,
        scheduledAt,
        playing: roomState.playing,
      });

      socket.emit('SEEK_CONFIRMED', {
        position: roomState.position,
        serverTime: roomState.updatedAt,
        scheduledAt,
        playing: roomState.playing,
      });
    });

    // Sync heartbeat
    socket.on('SYNC', (data) => {
      if (!roomService.canControl(roomId, socket.id)) return;

      roomState.position = Number(data.position) || 0;
      roomState.playing = Boolean(data.playing);
      roomState.updatedAt = Date.now();

      socket.to(roomId).emit('SYNC', {
        position: roomState.position,
        playing: roomState.playing,
        serverTime: roomState.updatedAt,
      });
    });

    // Leave room
    socket.on('LEAVE_ROOM', () => {
      const currentHost = roomService.hostIds.get(roomId);
      const isHostLeaving = socket.id === currentHost;

      roomService.removeParticipant(roomState, socket.id);

      if (isHostLeaving) {
        console.log('Host left room:', roomId);
        if (roomState.participants.length > 0) {
          const nextHost =
            roomState.participants.find((p) =>
              (roomState.controllers || []).includes(p.id)
            ) || roomState.participants[0];

          roomService.hostIds.set(roomId, nextHost.id);
          console.log(`Promoted ${nextHost.name} (${nextHost.id}) to Host on leave.`);

          const updatedParticipants = roomService.getParticipantsWithRole(roomId);
          io.to(roomId).emit('HOST_CHANGED', {
            hostId: nextHost.id,
            hostName: nextHost.name,
            participants: updatedParticipants,
          });

          const nextHostSocket = io.sockets.sockets.get(nextHost.id);
          if (nextHostSocket) {
            nextHostSocket.emit('ROLE', { isHost: true });
          }
        } else {
          roomService.endRoom(roomId, roomState);
          io.to(roomId).emit('HOST_DISCONNECTED');
        }
        return;
      }

      const participantsWithRole = roomService.getParticipantsWithRole(roomId);
      socket.to(roomId).emit('PARTICIPANT_LEFT', {
        participants: participantsWithRole,
        hostId: currentHost,
      });
      io.to(roomId).emit('CONTROLLERS_UPDATED', {
        controllers: roomState.controllers,
      });
    });

    // Socket disconnect handler
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);

      roomService.removeParticipant(roomState, socket.id);
      const currentHost = roomService.hostIds.get(roomId);

      if (socket.id === currentHost) {
        console.log('Host disconnected from room:', roomId);

        if (roomState.participants.length > 0) {
          const nextHost =
            roomState.participants.find((p) =>
              (roomState.controllers || []).includes(p.id)
            ) || roomState.participants[0];

          roomService.hostIds.set(roomId, nextHost.id);
          console.log(`Promoted ${nextHost.name} (${nextHost.id}) to Host on disconnect.`);

          const updatedParticipants = roomService.getParticipantsWithRole(roomId);
          io.to(roomId).emit('HOST_CHANGED', {
            hostId: nextHost.id,
            hostName: nextHost.name,
            participants: updatedParticipants,
          });

          const nextHostSocket = io.sockets.sockets.get(nextHost.id);
          if (nextHostSocket) {
            nextHostSocket.emit('ROLE', { isHost: true });
          }
        } else {
          roomService.endRoom(roomId, roomState);
          io.to(roomId).emit('HOST_DISCONNECTED');
        }
      } else {
        const remainingParticipants = roomService.getParticipantsWithRole(roomId);
        socket.to(roomId).emit('PARTICIPANT_LEFT', {
          participants: remainingParticipants,
          hostId: currentHost,
        });
      }

      socket.to(roomId).emit('MEET_PEER_LEFT', { id: socket.id });
      io.to(roomId).emit('CONTROLLERS_UPDATED', {
        controllers: roomState.controllers,
      });
    });
  });
}
