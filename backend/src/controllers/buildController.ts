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

const REQUIRED_CORE_FILES = [
  'backend/package.json',
  'backend/tsconfig.json',
  'backend/.env',
  'backend/src/server.ts',
  'backend/src/app.ts',
  'backend/src/config/db.ts',
  'frontend/package.json',
  'frontend/tsconfig.json',
  'frontend/vite.config.ts',
  'frontend/index.html',
  'frontend/src/main.tsx',
  'frontend/src/App.tsx'
];

function ensureCorePlannerFiles(plannerResult: PlannerResult): PlannerResult {
  const existingPaths = new Set(plannerResult.files.map(file => file.path));
  const files = [...plannerResult.files];

  for (const path of REQUIRED_CORE_FILES) {
    if (!existingPaths.has(path)) {
      files.push({
        path,
        explanation: `Required core file for successful ${path.startsWith('backend/') ? 'backend' : 'frontend'} validation`
      });
      existingPaths.add(path);
    }
  }

  const folders = new Set(plannerResult.structure.folders);
  for (const file of files) {
    const segments = file.path.split('/');
    segments.pop();
    let cursor = '';
    for (const segment of segments) {
      cursor = cursor ? `${cursor}/${segment}` : segment;
      folders.add(cursor);
    }
  }

  return {
    ...plannerResult,
    structure: { folders: Array.from(folders) },
    files
  };
}

function ensureDepthCoverage(
  plannerResult: PlannerResult,
  depthResult: DepthResult
): DepthResult {
  const depthByPath = new Map(depthResult.files.map(file => [file.path, file]));
  const files: FileDescriptionItem[] = [...depthResult.files];

  for (const plannedFile of plannerResult.files) {
    if (!depthByPath.has(plannedFile.path)) {
      files.push({
        path: plannedFile.path,
        description: {
          type: 'Core project file',
          purpose: plannedFile.explanation || `Implement ${plannedFile.path}`,
          imports: [],
          exports: [],
          props: [],
          connects_to: [],
          explanation: `Create a complete and valid file for ${plannedFile.path}.`
        }
      });
      depthByPath.set(plannedFile.path, files[files.length - 1]);
    }
  }

  return {
    ...depthResult,
    files
  };
}

function buildCodeGenerationQueue(
  depthResult: DepthResult,
  promptResult: PromptGeneratorResult
): PromptFileItem[] {
  const promptsByPath = new Map(promptResult.files.map(file => [file.path, file.prompt]));

  return depthResult.files.map((file) => {
    const existingPrompt = promptsByPath.get(file.path);
    if (existingPrompt && existingPrompt.trim()) {
      return { path: file.path, prompt: existingPrompt };
    }

    return {
      path: file.path,
      prompt: [
        `Write a complete ${file.path} file.`,
        `Purpose: ${file.description.purpose}`,
        `Type: ${file.description.type}`,
        `Explanation: ${file.description.explanation}`,
        file.path === 'backend/package.json'
          ? 'Must include scripts: "dev": "nodemon --exec ts-node src/server.ts", "build": "tsc".'
          : '',
        file.path === 'frontend/package.json'
          ? 'Must include scripts: "dev": "vite", "build": "tsc && vite build".'
          : '',
        file.path === 'backend/src/server.ts'
          ? `First line must be: import 'dotenv/config'; and initDB() must be wrapped in try/catch.`
          : ''
      ].filter(Boolean).join('\n')
    };
  });
}

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
      const plannerRawResult = await plannerAgent(prompt);
      const plannerResult = ensureCorePlannerFiles(plannerRawResult);

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
      const depthRawResult = await depthAgent(prompt, plannerResult);
      const depthResult = ensureDepthCoverage(plannerResult, depthRawResult);

      sendToClient(userId, { projectId, type: 'build', status: 'Generating code prompts...' });
      const promptResult = await promptGeneratorAgent(prompt, plannerResult, depthResult);
      const generationQueue = buildCodeGenerationQueue(depthResult, promptResult);

      sendToClient(userId, { projectId, type: 'build', status: 'Generating code...' });
      const codeFiles: FileItem[] = await Promise.all(
        generationQueue.map(pf =>
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
