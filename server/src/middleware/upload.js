import fs from 'fs';
import multer from 'multer';
import { MEDIA_DIR } from '../config/index.js';

if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

export const upload = multer({
  dest: MEDIA_DIR,
  limits: {
    fileSize: 1024 * 1024 * 1024 * 2, // 2 GB max file size
  },
});
