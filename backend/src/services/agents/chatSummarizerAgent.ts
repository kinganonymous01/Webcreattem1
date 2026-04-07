import { GoogleGenAI } from '@google/genai';
import { safeParseJSON } from '../../utils/promptTemplates';
import { retryableGenerateContent } from './retryableGenerateContent';

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });

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

  const response = await retryableGenerateContent(ai, {
    model: 'gemini-3-flash-preview',
    contents: `
Chat history:
${JSON.stringify(chatHistory, null, 2)}

Current user message:
${currentMessage}

Analyze and return the JSON.
`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    }
  }, 'chatSummarizerAgent');

  const raw = response.text || '';
  return safeParseJSON<ChatSummaryResult>(raw);
}
