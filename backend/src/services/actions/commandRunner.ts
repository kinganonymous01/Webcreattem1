import { Sandbox } from 'e2b';
import { logStructured } from '../../utils/structuredLogger';

export async function commandRunner(
  sandbox: Sandbox,
  command: string
): Promise<CommandResult> {
  logStructured('backend/src/services/actions/commandRunner.ts', 'commandRunner.start', { command });
  try {
    const result = await sandbox.commands.run(command, {
      timeoutMs: 120_000
    });
    const normalizedResult = {
      stdout:   result.stdout,
      stderr:   result.stderr,
      exitCode: result.exitCode
    };
    logStructured('backend/src/services/actions/commandRunner.ts', 'commandRunner.success', {
      command,
      result: normalizedResult
    });
    return normalizedResult;
  } catch (error: any) {
    const errorResult = {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || String(error),
      exitCode: error.exitCode || 2
    };
    logStructured('backend/src/services/actions/commandRunner.ts', 'commandRunner.error', {
      command,
      result: errorResult
    }, 'ERROR');
    return errorResult;
  }
}
