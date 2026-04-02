import { GoogleGenAI } from '@google/genai';
import { TECH_STACK, safeParseJSON } from '../../utils/promptTemplates';

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });

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
src/server.ts (imports 'dotenv/config' first, initDB in try/catch), src/app.ts,
src/config/db.ts. At minimum, GET / returns { message: 'ok' }.
════════════════════════════════════════════════════════════════

Additional rules (supplementing the ABSOLUTE STRUCTURE RULE above):
- backend/package.json and frontend/package.json MUST be included.
- backend/package.json MUST have scripts: "dev": "nodemon --exec ts-node src/server.ts", "build": "tsc"
- frontend/package.json MUST have scripts: "dev": "vite", "build": "tsc && vite build"
- Include backend/.env with DATABASE_URL and JWT_SECRET placeholders.
- Include backend/src/config/db.ts that initializes Neon DB.
- Include frontend/vite.config.ts with /api proxy to http://localhost:5000.
- NEVER include mongoose, mongodb, or native C++ packages.
- Use bcryptjs for password hashing if auth is needed.
- Use @neondatabase/serverless for ALL database access.
`;

export async function plannerAgent(
  prompt: string
): Promise<PlannerResult> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Create a project plan for: ${prompt}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    }
  });

  const raw = response.text || '';
  return safeParseJSON<PlannerResult>(raw);
}
