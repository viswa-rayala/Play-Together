import { Router } from 'express';
import * as roomController from '../controllers/roomController.js';

const router = Router();

router.get('/health', roomController.healthCheck);
router.post('/api/rooms/create', roomController.createRoom);
router.get('/api/rooms/:roomId/exists', roomController.checkRoomExists);

export default router;
