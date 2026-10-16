import express from 'express';
import { corsMiddleware } from './middleware/cors.js';
import roomRoutes from './routes/roomRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';

const app = express();

// Base Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Root Status
app.get('/', (_req, res) => {
  res.json({
    name: 'Play Together Unified API',
    status: 'online',
    version: '1.0.0',
    health: '/health',
  });
});

// REST API & Media Routes
app.use(roomRoutes);
app.use(mediaRoutes);

export default app;
