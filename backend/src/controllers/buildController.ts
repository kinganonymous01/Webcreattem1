import { Request, Response } from 'express';
import crypto from 'crypto';
import { sendToClient } from '../utils/wsClients';
import { plannerAgent } from '../services/agents/plannerAgent';
import { depthAgent } from '../services/agents/depthAgent';
import { promptGeneratorAgent } from '../services/agents/promptGeneratorAgent';
import { codeGeneratorAgent } from '../services/agents/codeGeneratorAgent';
import { generateOrchestrator } from '../services/orchestrators/generateOrchestrator';
import { createProject } from '../models/Project';
import pLimit from 'p-limit';

export async function build(req: Request, res: Response): Promise<any> {
  try {
    const { userId, username } = req.user;
    const { prompt }           = req.body;

    const limit     = pLimit(3);
    const projectId = crypto.randomUUID();

    sendToClient(userId, {
      projectId,
      type:   'build',
      status: 'Build started'
    });

    try {
      sendToClient(userId, { projectId, type: 'build', status: 'Planning project structure...' });
      const plannerResult = await plannerAgent(prompt);

      if (!plannerResult.projectName) {
        throw new Error('Planner did not return a project name');
      }

      const hasBackend  = plannerResult.files.some(f => f.path.startsWith('backend/'));
      const hasFrontend = plannerResult.files.some(f => f.path.startsWith('frontend/'));

      if (!hasBackend || !hasFrontend) {
        const missing = !hasBackend ? 'backend/' : 'frontend/';
        sendToClient(userId, { projectId, type: 'build', status: 'Build failed' });
        return res.status(500).json({
          success: false,
          message: `Planner did not generate required ${missing} structure. Please try again.`
        });
      }

      sendToClient(userId, { projectId, type: 'build', status: 'Analyzing file requirements...' });
      const depthResult = await depthAgent(prompt, plannerResult);

      sendToClient(userId, { projectId, type: 'build', status: 'Generating code prompts...' });
      const promptResult = await promptGeneratorAgent(prompt, plannerResult, depthResult);

      sendToClient(userId, { projectId, type: 'build', status: 'Generating code...' });
      const codeFiles: FileItem[] = await Promise.all(
        promptResult.files.map(pf =>
          limit(async () => {
            const content = await codeGeneratorAgent(pf.prompt, pf.path);
            return { path: pf.path, content };
          })
        )
      );

      sendToClient(userId, { projectId, type: 'build', status: 'Validating and fixing code...' });
      const orchResult = await generateOrchestrator({
        projectId,
        userId,
        files:        codeFiles,
        descriptions: depthResult.files,
        structure:    depthResult.structure
      });

      if (!orchResult.success) {
        sendToClient(userId, {
          projectId,
          type:   'build',
          status: 'Build failed — validation could not resolve all errors in time'
        });
        return res.status(500).json({
          success: false,
          message: 'Build validation failed. Please try again.'
        });
      }

      await createProject({
        id:           projectId,
        userId,
        projectName:  plannerResult.projectName,
        prompt,
        descriptions: depthResult.files,
        structure:    depthResult.structure,
        files:        orchResult.files
      });

      sendToClient(userId, { projectId, type: 'build', status: 'Build complete' });

      return res.json({
        success:     true,
        projectId,
        projectName: plannerResult.projectName,
        structure:   depthResult.structure,
        files:       orchResult.files
      });

    } catch (innerErr) {
      console.error('Inner build error:', innerErr);
      sendToClient(userId, { projectId, type: 'build', status: 'Build failed' });
      return res.status(500).json({ success: false, message: 'Build pipeline failed' });
    }

  } catch (outerErr) {
    console.error('Outer build error:', outerErr);
    return res.status(500).json({ success: false, message: 'Failed to start build' });
  }
}
