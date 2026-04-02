type LogLevel = 'INFO' | 'WARN' | 'ERROR';

function toSafeJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return JSON.stringify({
      serializationError: error instanceof Error ? error.message : String(error)
    });
  }
}

export function logStructured(
  sourceFile: string,
  event: string,
  data?: unknown,
  level: LogLevel = 'INFO'
): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    sourceFile,
    event,
    data
  };

  console.log(`[TRACE] ${toSafeJson(payload)}`);
}

export function logRawModelOutput(
  sourceFile: string,
  model: string,
  raw: string
): void {
  console.log(`[TRACE][${sourceFile}] Raw model output start (model=${model})`);
  console.log(raw);
  console.log(`[TRACE][${sourceFile}] Raw model output end (model=${model})`);
}
