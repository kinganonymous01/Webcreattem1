import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { chat } from '../controllers/chatController';

const router = Router();

router.post('/chat', authMiddleware, chat);

export default router;
