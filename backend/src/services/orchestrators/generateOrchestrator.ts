import { Sandbox } from 'e2b';
import { sendToClient } from '../../utils/wsClients';
import { errorAgent } from '../agents/errorAgent';
import { commandRunner } from '../actions/commandRunner';
import { fileUpdater } from '../actions/fileUpdater';
import { fileReader } from '../actions/fileReader';
import { syncFilesFromSandbox } from '../actions/fileSyncer';

const FIVE_MINUTES      = 5 * 60 * 1000;
const VALIDATION_COMMANDS = [
  'cd backend && npm install',
  'cd backend && npm run build',
  'cd frontend && npm install',
  'cd frontend && npm run build'
];

export async function generateOrchestrator(
  input: GenerateOrchestratorInput
): Promise<GenerateOrchestratorResult> {
  const { projectId, userId, files, descriptions } = input;

  const sandbox = await Sandbox.create({
    timeoutMs: 360_000
  });

  try {
    for (const file of files) {
      await sandbox.files.write(file.path, file.content);
    }

    const startTime     = Date.now();
    const timeRemaining = () => FIVE_MINUTES - (Date.now() - startTime);

    let isRunning:    boolean         = true;
    let currentFiles: FileItem[]      = [...files];
    let lastErrors:   CleanedError[]  = [];
    let previousLog:  ActionLogItem[] = [];

    while (isRunning && timeRemaining() > 0) {
      sendToClient(userId, {
        projectId,
        type:   'build',
        status: 'Running validation...'
      });

      const validationErrors: CleanedError[] = [];

      for (const cmd of VALIDATION_COMMANDS) {
        const result = await commandRunner(sandbox, cmd);
        if (result.exitCode !== 0) {
          validationErrors.push({
            command: cmd,
            side:    cmd.includes('frontend') ? 'frontend' : 'backend',
            error:   result.stderr || result.stdout
          });
        }
      }

      if (validationErrors.length === 0) {
        isRunning  = false;
        lastErrors = [];
        break;
      }

      lastErrors = validationErrors;

      let currentErrors: CleanedError[] = [...validationErrors];

      while (currentErrors.length > 0 && timeRemaining() > 0) {
        sendToClient(userId, {
          projectId,
          type:   'build',
          status: 'Fixing errors...'
        });

        const agentResponse = await errorAgent({
          currentFiles,
          descriptions,
          errors:      currentErrors,
          previousLog
        });

        if (agentResponse.action === "1") {
          const cmd    = agentResponse.data as string;
          const result = await commandRunner(sandbox, cmd);
          const logResult = result.stdout + result.stderr;

          const filteredErrors = currentErrors.filter(e =>
            logResult.includes(e.error.slice(0, 50))
          );
          const fullResult = filteredErrors.length > 0
            ? logResult + '\n\nFiltered errors:\n' + JSON.stringify(filteredErrors)
            : logResult;

          previousLog.push({ action: "1", data: cmd, result: fullResult });
        }

        if (agentResponse.action === "2") {
          const updates = agentResponse.data as FileUpdateItem[];
          await fileUpdater(sandbox, currentFiles, updates);
          previousLog.push({ action: "2", data: updates, result: 'Files updated' });
        }

        if (agentResponse.action === "3") {
          const reads    = agentResponse.data as FileReadItem[];
          const contents = fileReader(currentFiles, reads);
          previousLog.push({ action: "3", data: reads, result: contents });
        }

        if (agentResponse.action === "0") {
          if (agentResponse.fixed_status === true) {
            currentErrors = [];
          }
          previousLog.push({ action: "0", data: '', result: '' });
          break;
        }
      }
    }

    const passed = lastErrors.length === 0;

    if (passed) {
      await syncFilesFromSandbox(sandbox, currentFiles);
    }

    sendToClient(userId, {
      projectId,
      type:   'build',
      status: passed ? 'Validation passed' : 'Validation timed out'
    });

    return {
      success: passed,
      files:   currentFiles,
      errors:  lastErrors
    };

  } finally {
    try {
      await sandbox.kill();
    } catch (killErr) {
      console.error('Failed to kill generate sandbox:', killErr);
    }
  }
}
