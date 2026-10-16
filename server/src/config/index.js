import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root directory (two levels up from server/src/config)
export const ROOT_DIR = path.resolve(__dirname, '../../../');
export const SERVER_DIR = path.resolve(__dirname, '../../');

export const PORT = Number(process.env.PORT || 3000);

// Use root media/ directory to preserve uploaded files
export const MEDIA_DIR = process.env.MEDIA_DIR || path.join(ROOT_DIR, 'media');

export const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

export const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi', '.m4v'];
export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'];

// Scheduling constants (ms)
export const SCHEDULE_PLAY_LEAD_MS = 200; // Beatsync lead time for start synchronization
export const SCHEDULE_SEEK_LEAD_MS = 150; // Lead time for seek synchronization
