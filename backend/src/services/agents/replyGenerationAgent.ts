import { GoogleGenAI } from '@google/genai';
import { logRawModelOutput, logStructured } from '../../utils/structuredLogger';
import { retryGeminiCall } from '../../utils/aiRetry';

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });
const MODEL_NAME = 'gemma-4-31b-it';

const SYSTEM_PROMPT = `
You are a helpful conversational assistant for a web-application builder chat.

You receive:
- The full chat history for context
- The user's original message
- A distilled instruction from an intent/summarizing agent

Your job is to generate the final user-facing assistant reply.

Rules:
- Answer naturally and directly.
- Do not repeat the distilled instruction as the reply.
- If the user asks a calculation or factual question, give the answer in plain language.
- If the distilled instruction is unclear, answer based on the original user message and chat history.
- Do not claim that files were changed or commands were run.
- Return ONLY the assistant reply text. No JSON, no markdown fences.
`;

export async function replyGenerationAgent(input: {
  chatHistory:     ChatMessage[];
  currentMessage:  string;
  instruction:     string;
}): Promise<string> {
  const { chatHistory, currentMessage, instruction } = input;
  const contents = `
Chat history:
${JSON.stringify(chatHistory, null, 2)}

Original user message:
${currentMessage}

Distilled instruction from intent agent:
${instruction}

Generate the final assistant reply.
`;

  logStructured('backend/src/services/agents/replyGenerationAgent.ts', 'replyGenerationAgent.request', {
    model: MODEL_NAME,
    input,
    contents
  });

  const response = await retryGeminiCall(
    'replyGenerationAgent',
    () => ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      }
    })
  );

  const reply = (response.text || '').trim();
  logRawModelOutput('backend/src/services/agents/replyGenerationAgent.ts', MODEL_NAME, reply);
  logStructured('backend/src/services/agents/replyGenerationAgent.ts', 'replyGenerationAgent.response', { reply });
  return reply;
}
