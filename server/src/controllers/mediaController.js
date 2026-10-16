import fs from 'fs';
import path from 'path';
import { MEDIA_DIR } from '../config/index.js';

export function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.mp3': return 'audio/mpeg';
    case '.wav': return 'audio/wav';
    case '.ogg': return 'audio/ogg';
    case '.aac': return 'audio/aac';
    case '.flac': return 'audio/flac';
    case '.m4a': return 'audio/mp4';
    case '.mp4': return 'video/mp4';
    case '.webm': return 'video/webm';
    case '.mov': return 'video/quicktime';
    case '.mkv': return 'video/x-matroska';
    default: return 'application/octet-stream';
  }
}

/**
 * POST /upload
 * Handles media upload and organizes files into media/ storage.
 */
export function uploadMedia(req, res) {
  const files = req.files || (req.file ? [req.file] : []);

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No media file selected' });
  }

  const savedMedia = [];

  for (const file of files) {
    const originalName = path.basename(file.originalname);
    const finalPath = path.join(MEDIA_DIR, originalName);

    if (fs.existsSync(finalPath)) {
      try { fs.unlinkSync(file.path); } catch (e) {}
    } else {
      try { fs.renameSync(file.path, finalPath); } catch (e) {}
    }
    savedMedia.push(originalName);
  }

  console.log('Media uploaded:', savedMedia);

  res.json({
    success: true,
    media: savedMedia[0],
    files: savedMedia,
  });
}

/**
 * GET /media/:file
 * HTTP 206 Byte-Range streaming for fast, low-latency audio/video scrubbing.
 */
export function streamMedia(req, res) {
  const fileName = path.basename(req.params.file);
  const filePath = path.join(MEDIA_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Media file not found');
  }

  const stat = fs.statSync(filePath);
  const size = stat.size;
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      'Content-Length': size,
      'Content-Type': getContentType(fileName),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'Content-Disposition': 'inline',
    });

    return fs.createReadStream(filePath).pipe(res);
  }

  const parts = range.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : size - 1;

  if (start >= size || start > end) {
    return res.status(416).send('Invalid range');
  }

  const actualEnd = Math.min(end, size - 1);
  const chunkSize = actualEnd - start + 1;

  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${actualEnd}/${size}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunkSize,
    'Content-Type': getContentType(fileName),
    'Cache-Control': 'public, max-age=3600',
    'Content-Disposition': 'inline',
  });

  fs.createReadStream(filePath, { start, end: actualEnd }).pipe(res);
}
