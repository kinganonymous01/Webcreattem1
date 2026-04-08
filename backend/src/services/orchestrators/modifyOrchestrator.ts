import { Sandbox } from 'e2b';
import { sendToClient } from '../../utils/wsClients';
import { modifyAgent } from '../agents/modifyAgent';
import { errorAgent } from '../agents/errorAgent';
import { commandRunner } from '../actions/commandRunner';
import { fileUpdater } from '../actions/fileUpdater';
import { fileReader } from '../actions/fileReader';
import { syncFilesFromSandbox } from '../actions/fileSyncer';
import { logStructured } from '../../utils/structuredLogger';

const FIVE_MINUTES      = 5 * 60 * 1000;
const VALIDATION_COMMANDS = [
  'cd backend && npm install',
  'cd backend && npm run build',
  'cd frontend && npm install',
  'cd frontend && npm run build'
];

export async function modifyOrchestrator(
  input: ModifyOrchestratorInput
): Promise<ModifyOrchestratorResult> {
  const { files, descriptions, instruction, projectId, userId } = input;
  logStructured('backend/src/services/orchestrators/modifyOrchestrator.ts', 'modifyOrchestrator.start', {
    projectId,
    userId,
    instruction,
    fileCount: files.length,
    descriptionCount: descriptions.length
  });

  const sandbox = await Sandbox.create({ timeoutMs: 360_000 });

  try {
    for (const file of files) {
      await sandbox.files.write(file.path, file.content);
      logStructured('backend/src/services/orchestrators/modifyOrchestrator.ts', 'modifyOrchestrator.sandbox.writeFile', {
        path: file.path,
        content: file.content
      });
    }

    const startTime     = Date.now();
    const timeRemaining = () => FIVE_MINUTES - (Date.now() - startTime);

    let currentFiles:  FileItem[]      = [...files];
    let modifiedFiles: FileItem[]      = [];
    let previousLog:   ActionLogItem[] = [];
    let lastErrors:    CleanedError[]  = [];
    let agentFixed:    boolean         = false;

    while (!agentFixed && timeRemaining() > 0) {
      const agentResponse = await modifyAgent({
        instruction,
        descriptions,
        previousLog,
        validationErrors: lastErrors
      });
      logStructured('backend/src/services/orchestrators/modifyOrchestrator.ts', 'modifyOrchestrator.initialLoop.agentResponse', agentResponse);

      if (agentResponse.action === "1") {
        const cmd    = agentResponse.data as string;
        const result = await commandRunner(sandbox, cmd);
        logStructured('backend/src/services/orchestrators/modifyOrchestrator.ts', 'modifyOrchestrator.initialLoop.commandResult', {
          command: cmd,
          result
        });
        previousLog.push({ action: "1", data: cmd, result: result.stdout + result.stderr });
      }

      if (agentResponse.action === "2") {
        const updates = agentResponse.data as FileUpdateItem[];
        await fileUpdater(sandbox, currentFiles, updates);
        logStructured('backend/src/services/orchestrators/modifyOrchestrator.ts', 'modifyOrchestrator.initialLoop.filesUpdated', updates);
        updates.forEach(u => {
          const existing = modifiedFiles.findIndex(m => m.path === u.filepath);
          if (existing !== -1) {
            modifiedFiles[existing].content = u.updated_code;
          } else {
            modifiedFiles.push({ path: u.filepath, content: u.updated_code });
          }
        });
        previousLog.push({ action: "2", data: updates, result: 'Files updated' });
      }

      if (agentResponse.action === "3") {
        const reads    = agentResponse.data as FileReadItem[];
        const contents = fileReader(currentFiles, reads);
        logStructured('backend/src/services/orchestrators/modifyOrchestrator.ts', 'modifyOrchestrator.initialLoop.filesRead', {
          reads,
          contents
        });
        previousLog.push({ action: "3", data: reads, result: contents });
      }

      if (agentResponse.action === "0") {
        agentFixed = agentResponse.fixed_status;
        previousLog.push({ action: "0", data: '', result: '' });
        break;
      }
    }

    sendToClient(userId, { projectId, type: 'chat', status: 'Running validation...' });

    const validationErrors: CleanedError[] = [];
    for (const cmd of VALIDATION_COMMANDS) {
      const result = await commandRunner(sandbox, cmd);
      logStructured('backend/src/services/orchestrators/modifyOrchestrator.ts', 'modifyOrchestrator.validation.command.result', {
        command: cmd,
        result
      });
      if (result.exitCode !== 0) {
        validationErrors.push({
          command: cmd,
          side:    cmd.includes('frontend') ? 'frontend' : 'backend',
          error:   result.stdout || result.stderr
        });
      }
    }

    lastErrors = validationErrors;

    if (validationErrors.length === 0) {
      await syncFilesFromSandbox(sandbox, currentFiles);
      return {
        success:       true,
        files:         currentFiles,
        modifiedFiles,
        message:       instruction,
        errors:        []
      };
    }

    let modificationPassed = false;

    while (!modificationPassed && timeRemaining() > 0) {
      const currentSide = lastErrors.some(e => e.side === 'frontend')
        ? (lastErrors.some(e => e.side === 'backend') ? 'both' : 'frontend')
        : 'backend';

      const filteredDesc = descriptions.filter(d =>
        currentSide === 'both' ? true : d.path.startsWith(currentSide + '/')
      );

      const currentValidationErrors = lastErrors.filter(e =>
        currentSide === 'both' ? true : e.side === currentSide
      );

      let isFixed = false;

      while (!isFixed && timeRemaining() > 0) {
        const agentResponse = await modifyAgent({
          instruction,
          descriptions:     filteredDesc,
          previousLog,
          validationErrors: currentValidationErrors,
          promptContext:    `Focus on ${currentSide} errors`
        });
        logStructured('backend/src/services/orchestrators/modifyOrchestrator.ts', 'modifyOrchestrator.fixLoop.agentResponse', {
          currentSide,
          agentResponse,
          currentValidationErrors
        });

        if (agentResponse.action === "1") {
          const cmd    = agentResponse.data as string;
          const result = await commandRunner(sandbox, cmd);
          logStructured('backend/src/services/orchestrators/modifyOrchestrator.ts', 'modifyOrchestrator.fixLoop.commandResult', {
            command: cmd,
            result
          });
          const resultWithErrors = result.stdout + result.stderr +
            '\n\nActive errors:\n' + JSON.stringify(currentValidationErrors);
          previousLog.push({ action: "1", data: cmd, result: resultWithErrors });
        }

        if (agentResponse.action === "2") {
          const updates = agentResponse.data as FileUpdateItem[];
          await fileUpdater(sandbox, currentFiles, updates);
          logStructured('backend/src/services/orchestrators/modifyOrchestrator.ts', 'modifyOrchestrator.fixLoop.filesUpdated', updates);
          updates.forEach(u => {
            const existing = modifiedFiles.findIndex(m => m.path === u.filepath);
            if (existing !== -1) {
              modifiedFiles[existing].content = u.updated_code;
            } else {
              modifiedFiles.push({ path: u.filepath, content: u.updated_code });
            }
          });
          previousLog.push({ action: "2", data: updates, result: 'Files updated' });
        }

        if (agentResponse.action === "3") {
          const reads    = agentResponse.data as FileReadItem[];
          const contents = fileReader(currentFiles, reads);
          logStructured('backend/src/services/orchestrators/modifyOrchestrator.ts', 'modifyOrchestrator.fixLoop.filesRead', {
            reads,
            contents
          });
          previousLog.push({ action: "3", data: reads, result: contents });
        }

        if (agentResponse.action === "0") {
          isFixed = agentResponse.fixed_status;
          previousLog.push({ action: "0", data: '', result: '' });
          break;
        }
      }

      const newErrors: CleanedError[] = [];
      for (const cmd of VALIDATION_COMMANDS) {
        const result = await commandRunner(sandbox, cmd);
        logStructured('backend/src/services/orchestrators/modifyOrchestrator.ts', 'modifyOrchestrator.fixLoop.validation.command.result', {
          command: cmd,
          result
        });
        if (result.exitCode !== 0) {
          newErrors.push({
            command: cmd,
            side:    cmd.includes('frontend') ? 'frontend' : 'backend',
            error:   result.stderr || result.stdout
          });
        }
      }
      lastErrors = newErrors;

      if (lastErrors.length === 0) {
        modificationPassed = true;
        break;
      }
    }

    if (modificationPassed) {
      await syncFilesFromSandbox(sandbox, currentFiles);
      return {
        success:       true,
        files:         currentFiles,
        modifiedFiles,
        message:       instruction,
        errors:        []
      };
    }

    return {
      success:       false,
      files:         currentFiles,
      modifiedFiles: [],
      message:       'Could not complete within time limit',
      errors:        lastErrors
    };

  } finally {
    try {
      await sandbox.kill();
      logStructured('backend/src/services/orchestrators/modifyOrchestrator.ts', 'modifyOrchestrator.sandbox.killed');
    } catch (killErr) {
      logStructured('backend/src/services/orchestrators/modifyOrchestrator.ts', 'modifyOrchestrator.sandbox.killError', killErr, 'ERROR');
      console.error('Failed to kill modify sandbox:', killErr);
    }
  }
}
