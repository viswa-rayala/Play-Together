import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { PORT } from './config/index.js';
import { setupSocketHandlers } from './sockets/socketHandler.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
  },
});

setupSocketHandlers(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Play-Together] Server running on http://localhost:${PORT}`);
});

export { server, io };
