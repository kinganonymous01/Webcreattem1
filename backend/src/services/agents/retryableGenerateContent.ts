import { GoogleGenAI, type GenerateContentResponse } from '@google/genai';

const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS  = 30000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function retryableGenerateContent(
  ai: GoogleGenAI,
  request: Parameters<GoogleGenAI['models']['generateContent']>[0],
  context: string
): Promise<GenerateContentResponse> {
  let attempt = 0;

  while (true) {
    attempt += 1;

    try {
      return await ai.models.generateContent(request);
    } catch (error) {
      const retryDelay = Math.min(BASE_RETRY_DELAY_MS * Math.max(1, attempt), MAX_RETRY_DELAY_MS);
      const errorMessage = toErrorMessage(error);

      console.warn(
        `[AI Retry] ${context} failed on attempt ${attempt}. Retrying in ${retryDelay}ms. Error: ${errorMessage}`
      );

      await sleep(retryDelay);
    }
  }
}
