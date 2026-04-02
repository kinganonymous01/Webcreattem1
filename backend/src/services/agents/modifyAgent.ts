import { GoogleGenAI } from '@google/genai';
import { TECH_STACK, safeParseJSON } from '../../utils/promptTemplates';
import { logRawModelOutput, logStructured } from '../../utils/structuredLogger';

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });
const MODEL_NAME = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `
You are a senior engineer implementing user-requested changes to a full-stack web application.

${TECH_STACK}

You receive a specific instruction, along with:
- File descriptions (context for what each file does)
- Previous actions you've taken this session
- Any current validation errors (if in error-fixing mode)

Respond with ONE action at a time as a JSON object:
{
  "fixed_status": boolean,
  "action": "0" | "1" | "2" | "3",
  "data": <depends on action>
}

Action meanings:
  "0" = Modification complete (or errors fixed). fixed_status=true means confident.
  "1" = Run a command. data = "command string"
  "2" = Update files. data = [{ "filename": "x.ts", "filepath": "path/to/x.ts", "updated_code": "..." }]
  "3" = Read files. data = [{ "filename": "x.ts", "filepath": "path/to/x.ts" }]


════════════════════════════════════════════════════════════════
ABSOLUTE STRUCTURE RULE — CRITICAL:
════════════════════════════════════════════════════════════════
BOTH backend/ AND frontend/ must continue to exist after your modifications.
NEVER remove or disable either directory or its required files.
If modifying package.json: ALWAYS preserve "dev" and "build" script names exactly.
If modifying server.ts: ALWAYS preserve import 'dotenv/config' as FIRST line and
the try/catch around initDB().
Same WebContainers constraints as TECH_STACK: no bcrypt, no TCP packages,
all DB queries via sql tagged template literals, all frontend API calls as /api/...
════════════════════════════════════════════════════════════════

Additional constraints:
- All database changes use sql tagged template literals.
- New frontend API calls: always relative /api/... paths.
- New caching: @upstash/redis. New auth: bcryptjs.

Return ONLY raw JSON. No markdown, no code fences.
`;

export async function modifyAgent(input: {
  instruction:       string;
  descriptions:      FileDescriptionItem[];
  previousLog:       ActionLogItem[];
  validationErrors?: CleanedError[];
  promptContext?:    string;
}): Promise<AgentResponse> {
  const { instruction, descriptions, previousLog, validationErrors, promptContext } = input;
  const contents = `
Instruction to implement: ${instruction}
${promptContext ? `Context: ${promptContext}` : ''}

File descriptions:
${JSON.stringify(descriptions, null, 2)}

Previous actions this session:
${JSON.stringify(previousLog, null, 2)}

${validationErrors && validationErrors.length > 0
  ? `Current validation errors to fix:\n${JSON.stringify(validationErrors, null, 2)}`
  : 'No current validation errors.'}

Take ONE action.
`;
  logStructured('backend/src/services/agents/modifyAgent.ts', 'modifyAgent.request', {
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
  logRawModelOutput('backend/src/services/agents/modifyAgent.ts', MODEL_NAME, raw);
  const parsed = safeParseJSON<AgentResponse>(raw);
  logStructured('backend/src/services/agents/modifyAgent.ts', 'modifyAgent.response.parsed', parsed);
  return parsed;
}
