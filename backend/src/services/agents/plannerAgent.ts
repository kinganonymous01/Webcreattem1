import { GoogleGenAI } from '@google/genai';
import { TECH_STACK, safeParseJSON } from '../../utils/promptTemplates';
import { logRawModelOutput, logStructured } from '../../utils/structuredLogger';
import { retryGeminiCall } from '../../utils/aiRetry';

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });
const MODEL_NAME = 'gemma-4-31b-it';

const SYSTEM_PROMPT = `
You are a software architect planning the file structure for a full-stack web application.

${TECH_STACK}

Your job is to return a JSON object describing the project structure.
Return ONLY raw JSON — no markdown, no code fences, no explanations.

JSON shape:
{
  "projectName": "string — short kebab-case name",
  "structure": {
    "folders": ["backend", "backend/src", "backend/src/routes", "frontend", "frontend/src", ...]
  },
  "files": [
    { "path": "backend/src/server.ts", "explanation": "Express server entry point" },
    ...
  ]
}


════════════════════════════════════════════════════════════════
ABSOLUTE STRUCTURE RULE — READ THIS FIRST, OBEY IT ALWAYS:
════════════════════════════════════════════════════════════════
You MUST generate BOTH backend/ AND frontend/ files regardless of how simple
the user's request is. Even a portfolio, calculator, or static page MUST include
a minimal Express backend stub, because the validation system always runs:
  cd backend && npm install / npm run build
  cd frontend && npm install / npm run build
If backend/ is missing → guaranteed 5-minute timeout → build fails.
Minimal backend requires: package.json ("dev"+"build" scripts), tsconfig.json, .env,
src/server.ts (imports 'dotenv/config' first before any other code), src/app.ts. At minimum, GET / returns { message: 'ok' }.
════════════════════════════════════════════════════════════════

Additional rules (supplementing the ABSOLUTE STRUCTURE RULE above):
- backend/package.json and frontend/package.json MUST be included.
- backend/package.json MUST have scripts: "dev": "nodemon --exec ts-node src/server.ts", "build": "tsc"
- frontend/package.json MUST have scripts: "dev": "vite", "build": "tsc && vite build"
- Always include a backend/.env with DATABASE_URL and JWT_SECRET placeholders and if the user provides a real Neondb database url in the website build prompt then instead of a placeholder the DATABASE_URL should be the provided real Neondb database url.
- Always include a backend/src/config/db.ts that initializes Neon DB, if the user asks for a database feature or something similar in the website build prompt.
- Always include a frontend/vite.config.ts with /api proxy to http://localhost:5000.
- Always include a frontend/tsconfig.json with "include": ["src"] to scope type-checking to only the src folder, so that vite.config.ts is excluded from tsc and a separate tsconfig.node.json is not needed.
- NEVER include mongoose, mongodb, or native C++ packages.
- Use bcryptjs for password hashing if auth is needed.
- Use @neondatabase/serverless for ALL database access when a database is required.
`;

export async function plannerAgent(
  prompt: string
): Promise<PlannerResult> {
  const contents = `Create a project plan for the following website build prompt: ${prompt}`;

  const response = await retryGeminiCall(
    'plannerAgent',
    () => ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      }
    })
  );

  const raw = response.text || '';
  logRawModelOutput('backend/src/services/agents/plannerAgent.ts', MODEL_NAME, raw);
  const parsed = safeParseJSON<PlannerResult>(raw);
  logStructured('backend/src/services/agents/plannerAgent.ts', 'plannerAgent.output', parsed);
  return parsed;
}
