import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getProjects, getProject } from '../controllers/projectController';

const router = Router();

router.get('/projects',     authMiddleware, getProjects);
router.get('/projects/:id', authMiddleware, getProject);

export default router;
