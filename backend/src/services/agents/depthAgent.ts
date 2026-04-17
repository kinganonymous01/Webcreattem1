import { GoogleGenAI } from '@google/genai';
import { TECH_STACK, exampleDescription, safeParseJSON } from '../../utils/promptTemplates';
import { logRawModelOutput, logStructured } from '../../utils/structuredLogger';
import { retryGeminiCall } from '../../utils/aiRetry';

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });
const MODEL_NAME = 'gemma-4-31b-it';

const SYSTEM_PROMPT = `
You are a senior full-stack engineer writing detailed implementation plans.

${TECH_STACK}

════════════════════════════════════════════════════════════════
ABSOLUTE STRUCTURE RULE — OBEY ALWAYS:
════════════════════════════════════════════════════════════════
BOTH backend/ AND frontend/ MUST be described/generated. No exceptions.
Even for simple static sites, a minimal Express backend is required because
the validation system always runs npm install/build for both directories.
Minimal backend: package.json with "dev"+"build" scripts, tsconfig.json,
.env, src/server.ts (import 'dotenv/config' first before any other code),
src/app.ts. Minimum: GET / returns { message: 'ok' }.
════════════════════════════════════════════════════════════════

For EACH file in the project, write a detailed FileDescription object.

WEBCONTAINERS CONSTRAINTS — APPLY TO ALL FILES:
- Database files(if a database is requested in the project prompt): MUST use @neondatabase/serverless with sql tagged template literals.
- Auth files(if auth is requested in the project files): MUST use bcryptjs (not bcrypt).
- Reddis(if Reddis is requested in the project prompt):Must use @upstash/redis.
- No native C++ packages at all.
- Any file that would import a forbidden package must use the WebContainers-compatible alternative.
- backend/.env file MUST be described and generated with DATABASE_URL + JWT_SECRET.
- frontend/vite.config.ts MUST include the /api proxy to localhost:5000.
- All frontend API calls MUST use relative paths (/api/...).

Return ONLY a JSON object. No markdown, no code fences.

JSON shape:
{
  "structure": { "folders": [...] },
  "files": [
    {
      "path": "backend/src/config/db.ts",
      "description": {
        "type": "Database configuration",
        "purpose": "Initializes Neon DB connection and creates tables on startup",
        "imports": ["neon from @neondatabase/serverless"],
        "exports": ["sql", "initDB"],
        "props": [],
        "connects_to": ["All files that need database access"],
        "explanation": "Uses explicit TypeScript env narrowing: const databaseUrl = process.env.DATABASE_URL; if (!databaseUrl) throw new Error('DATABASE_URL is required'); const sql = neon(databaseUrl). If this method is not suitable for a specific file, choose another safe narrowing strategy. initDB() runs CREATE TABLE IF NOT EXISTS for all tables."
      }
    },
    ...
  ]
}

${exampleDescription}
`;

export async function depthAgent(
  prompt:        string,
  plannerResult: PlannerResult
): Promise<DepthResult> {
  const contents = `
Project prompt: ${prompt}
File structure:
${JSON.stringify(plannerResult, null, 2)}

Write detailed descriptions for ALL ${plannerResult.files.length} files.
`;
  const response = await retryGeminiCall(
    'depthAgent',
    () => ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      }
    })
  );

  const raw = response.text || '';
  logRawModelOutput('backend/src/services/agents/depthAgent.ts', MODEL_NAME, raw);
  const parsed = safeParseJSON<DepthResult>(raw);
  logStructured('backend/src/services/agents/depthAgent.ts', 'depthAgent.output', parsed);
  return parsed;
}
