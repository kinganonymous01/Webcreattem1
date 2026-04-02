import { Sandbox } from 'e2b';

export async function commandRunner(
  sandbox: Sandbox,
  command: string
): Promise<CommandResult> {
  try {
    const result = await sandbox.commands.run(command, {
      timeoutMs: 120_000
    });

    return {
      stdout:   result.stdout,
      stderr:   result.stderr,
      exitCode: result.exitCode
    };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || String(error),
      exitCode: error.exitCode || 2
    };
  }
}
