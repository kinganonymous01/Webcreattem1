const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
const MAX_EXPONENT = 5;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '';
}

function getStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
    cause?: { status?: unknown; statusCode?: unknown };
  };

  const possibleValues = [
    candidate.status,
    candidate.statusCode,
    candidate.cause?.status,
    candidate.cause?.statusCode,
    typeof candidate.code === 'number' ? candidate.code : undefined
  ];

  for (const value of possibleValues) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function isRetriableGeminiError(_error: unknown): boolean {
  return true;
}

function getRetryDelay(attempt: number): number {
  const exponent = Math.min(Math.max(attempt - 1, 0), MAX_EXPONENT);
  const backoff = BASE_RETRY_DELAY_MS * (2 ** exponent);
  const jitter = Math.floor(Math.random() * 250);

  return Math.min(backoff + jitter, MAX_RETRY_DELAY_MS);
}

export async function retryGeminiCall<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  let attempt = 0;

  while (true) {
    attempt += 1;

    try {
      return await operation();
    } catch (error) {
      if (!isRetriableGeminiError(error)) {
        throw error;
      }

      const delay = getRetryDelay(attempt);
      const statusCode = getStatusCode(error);
      const message = getErrorMessage(error) || 'Unknown Gemini provider error';

      console.warn(
        `[GeminiRetry] ${operationName} attempt ${attempt} failed` +
        `${statusCode ? ` (status ${statusCode})` : ''}. Retrying in ${delay}ms. Error: ${message}`
      );

      await sleep(delay);
    }
  }
}
