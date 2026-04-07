import { GoogleGenAI } from '@google/genai';
import { TECH_STACK, safeParseJSON } from '../../utils/promptTemplates';
import { retryableGenerateContent } from './retryableGenerateContent';

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });

const SYSTEM_PROMPT = `
You are a senior engineer writing detailed code-generation prompts for each file.

${TECH_STACK}

════════════════════════════════════════════════════════════════
ABSOLUTE STRUCTURE RULE — OBEY ALWAYS:
════════════════════════════════════════════════════════════════
BOTH backend/ AND frontend/ MUST be described/generated. No exceptions.
Even for simple static sites, a minimal Express backend is required because
the validation system always runs npm install/build for both directories.
Minimal backend: package.json with "dev"+"build" scripts, tsconfig.json,
.env, src/server.ts (import 'dotenv/config' first, initDB in try/catch),
src/app.ts, src/config/db.ts. Minimum: GET / returns { message: 'ok' }.
════════════════════════════════════════════════════════════════

For each file, produce a self-contained prompt that a code-generation AI can use
to write the complete file with zero ambiguity.
For backend/src/server.ts: prompt MUST specify import 'dotenv/config' as FIRST line,
and try/catch around initDB() per the fault-tolerance requirement.
For backend/package.json: prompt MUST specify "dev": "nodemon --exec ts-node src/server.ts"
and "build": "tsc" as the exact script names.
For frontend/package.json: prompt MUST specify "dev": "vite" and "build": "tsc && vite build".

Each prompt MUST:
- Specify all imports explicitly (correct package names — bcryptjs not bcrypt, etc.)
- Describe every function, its inputs, outputs, and logic
- Mention all WebContainers-compatible constraints
- Include error handling patterns
- Reference connected files by path
- For frontend: specify using relative /api/... paths only (never localhost)
- For vite.config.ts: specify the /api proxy rule explicitly

Return ONLY a JSON object. No markdown, no code fences.

JSON shape:
{
  "files": [
    { "path": "backend/src/config/db.ts", "prompt": "Write a complete TypeScript file..." },
    ...
  ]
}
`;

export async function promptGeneratorAgent(
  prompt:        string,
  plannerResult: PlannerResult,
  depthResult:   DepthResult
): Promise<PromptGeneratorResult> {
  const fileDescriptions = depthResult.files.map(f =>
    `${f.path}: ${JSON.stringify(f.description)}`
  ).join('\n\n');

  const response = await retryableGenerateContent(ai, {
    model: 'gemini-3-flash-preview',
    contents: `
Original prompt: ${prompt}
All file descriptions:
${fileDescriptions}

Write a code-generation prompt for EACH of the ${depthResult.files.length} files.
`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    }
  }, 'promptGeneratorAgent');

  const raw = response.text || '';
  return safeParseJSON<PromptGeneratorResult>(raw);
}
