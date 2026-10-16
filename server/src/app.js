import express from 'express';
import fs from 'fs';
import path from 'path';
import { corsMiddleware } from './middleware/cors.js';
import roomRoutes from './routes/roomRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import { PUBLIC_DIR } from './config/index.js';

const app = express();

// Base Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REST API & Media Routes
app.use(roomRoutes);
app.use(mediaRoutes);

// Optional static assets (e.g. legacy fallback or prototype preview)
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  app.get('/', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
}

export default app;
