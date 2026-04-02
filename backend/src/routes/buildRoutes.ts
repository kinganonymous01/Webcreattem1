import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { build } from '../controllers/buildController';

const router = Router();

router.post('/build', authMiddleware, build);

export default router;
