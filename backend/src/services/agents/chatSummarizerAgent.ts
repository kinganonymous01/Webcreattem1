import { GoogleGenAI } from '@google/genai';
import { safeParseJSON } from '../../utils/promptTemplates';
import { logRawModelOutput, logStructured } from '../../utils/structuredLogger';
import { retryGeminiCall } from '../../utils/aiRetry';

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });
const MODEL_NAME = 'gemma-4-31b-it';

const SYSTEM_PROMPT = `
You are an AI that analyzes chat messages and determines user intent.

Given chat history and a current user message, return a JSON object:
{
  "type": "question" | "modification",
  "instruction": "string — clear, actionable instruction"
}

"question" = user wants information, explanation, or clarification that can be answered from general knowledge, the provided chat history, or straightforward reasoning. No code changes, file access, or terminal commands are needed.
"modification" = user wants the application code to be changed OR the user asks for information that requires project file access, code inspection, filesystem access, dependency inspection, terminal commands, build output, logs, or any other project-specific runtime/sandbox access.

Important classification examples:
- "What is 2 times 2?" => question
- "Explain what React state is" => question
- "How many lines are in server.ts?" => modification, because answering requires reading a project file
- "What files import App.tsx?" => modification, because answering requires project file inspection
- "Run the tests" => modification, because answering requires terminal access

For "modification", distill the instruction to be specific and actionable for an engineer/agent with file and terminal access.
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

  const response = await retryGeminiCall(
    'chatSummarizerAgent',
    () => ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      }
    })
  );

  const raw = response.text || '';
  logRawModelOutput('backend/src/services/agents/chatSummarizerAgent.ts', MODEL_NAME, raw);
  const parsed = safeParseJSON<ChatSummaryResult>(raw);
  logStructured('backend/src/services/agents/chatSummarizerAgent.ts', 'chatSummarizerAgent.response.parsed', parsed);
  return parsed;
}
