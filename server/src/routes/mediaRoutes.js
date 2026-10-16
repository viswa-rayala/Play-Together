import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import * as mediaController from '../controllers/mediaController.js';

const router = Router();

router.post('/upload', upload.any(), mediaController.uploadMedia);
router.get('/media/:file', mediaController.streamMedia);

export default router;
