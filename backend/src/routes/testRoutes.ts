import { Router } from 'express';
import {
  testSignupLogin,
  testPlannerAgent,
  testValidatorComponent,
  testDepthAgent,
  testCodeGeneratorAgent,
  testChatSummarizerAgent,
  testModifyAgent,
  testFullGenerationPipeline
} from '../controllers/testController';

const router = Router();

router.post('/test/auth', testSignupLogin);
router.post('/test/planner', testPlannerAgent);
router.post('/test/validator', testValidatorComponent);
router.post('/test/depth', testDepthAgent);
router.post('/test/codegen', testCodeGeneratorAgent);
router.post('/test/chatsummarizer', testChatSummarizerAgent);
router.post('/test/modify', testModifyAgent);
router.post('/test/pipeline', testFullGenerationPipeline);

export default router;
