import { GoogleGenAI } from '@google/genai';
import { safeParseJSON } from '../../utils/promptTemplates';
import { logRawModelOutput, logStructured } from '../../utils/structuredLogger';

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });
const MODEL_NAME = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `
You are an AI that analyzes chat messages and determines user intent.

Given chat history and a current user message, return a JSON object:
{
  "type": "question" | "modification",
  "instruction": "string — clear, actionable instruction"
}

"question" = user wants information, explanation, or clarification. No code changes needed.
"modification" = user wants the application code to be changed.

For "modification", distill the instruction to be specific and actionable for an engineer.
Return ONLY raw JSON. No markdown, no code fences.
`;

export async function chatSummarizerAgent(input: {
  chatHistory:    ChatMessage[];
  currentMessage: string;
}): Promise<ChatSummaryResult> {
  const { chatHistory, currentMessage } = input;
  const contents = `
Chat history:
${JSON.stringify(chatHistory, null, 2)}

Current user message:
${currentMessage}

Analyze and return the JSON.
`;
  logStructured('backend/src/services/agents/chatSummarizerAgent.ts', 'chatSummarizerAgent.request', {
    model: MODEL_NAME,
    input,
    contents
  });

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    }
  });

  const raw = response.text || '';
  logRawModelOutput('backend/src/services/agents/chatSummarizerAgent.ts', MODEL_NAME, raw);
  const parsed = safeParseJSON<ChatSummaryResult>(raw);
  logStructured('backend/src/services/agents/chatSummarizerAgent.ts', 'chatSummarizerAgent.response.parsed', parsed);
  return parsed;
}
