import { GoogleGenAI } from '@google/genai';
import { TECH_STACK, stripMarkdownFences } from '../../utils/promptTemplates';
import { logRawModelOutput, logStructured } from '../../utils/structuredLogger';
import { retryGeminiCall } from '../../utils/aiRetry';

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });
const MODEL_NAME = 'gemma-4-31b-it';

const SYSTEM_PROMPT = `
You are an expert full-stack engineer. Write complete, production-ready code files,you will be given the file path and prompt to generate the code for a single file for a fullstack project and you need to generate code for that file.


════════════════════════════════════════════════════════════════
ABSOLUTE STRUCTURE RULE:
════════════════════════════════════════════════════════════════
When writing ANY file, both backend/ and frontend/ must ultimately exist.
If you are fixing backend/ files, do not remove or break frontend/ references.
If you are fixing frontend/ files, do not remove or break backend/ references.
For server.ts: import 'dotenv/config' MUST be first line.
For package.json scripts: "dev" and "build" must have EXACT names as specified.
Never introduce bcrypt (use bcryptjs), never introduce TCP-based DB packages.
════════════════════════════════════════════════════════════════

Rules:
- Return ONLY the raw file content. No explanations. No markdown fences.
- The file must be immediately runnable with no modifications.
- Every import must match a real package in the dependencies.
- For local TypeScript source imports, always use extensionless paths.
  Examples: use './App' not './App.tsx', use './app' not './app.ts', use './config/db' not './config/db.ts'.
- if you are asked to generate code for frontend/tsconfig.json, Use "include": ["src"] to scope type-checking to only the src folder, so that vite.config.ts is excluded from tsc and a separate tsconfig.node.json is not needed.
- When applicable use bcryptjs (not bcrypt).
- When applicable use @neondatabase/serverless (not mongoose/pg/mysql2).
- All database queries use tagged template literals: sql\`...\`
- For ALL environment variables in TypeScript, default to this narrowing method:
  const value = process.env.MY_KEY;
  if (!value) throw new Error('MY_KEY is required');
  // then use value as narrowed string
  If and only if this method does not fit the file context, use another safe narrowing strategy.
- For server.ts: import 'dotenv/config' MUST be the absolute first line.
- For server.ts: when applicable(if asked for in the prompt) wrap initDB() in try/catch with console.warn fallback (DB may be dummy).
- For backend/package.json: scripts "dev" and "build" with EXACT values required.
- For frontend/package.json: scripts "dev" and "build" with EXACT values required.
- For .env files: include DATABASE_URL and JWT_SECRET, both of those might be placeholder values or actuall values and if information for those are not provided then create placeholder values for both.
- For vite.config.ts: include /api proxy pointing to http://localhost:5000.
- For React components: use fetch('/api/...') or axios('/api/...') — NO localhost.
- Include all error handling.
- Include all TypeScript types.
`;

export async function codeGeneratorAgent(
  filePrompt: string,
  filePath:   string
): Promise<string> {
  const contents = `Write the complete contents of: ${filePath}\n\n${filePrompt}`;

  const response = await retryGeminiCall(
    `codeGeneratorAgent:${filePath}`,
    () => ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      }
    })
  );

  const raw  = response.text || '';
  logRawModelOutput('backend/src/services/agents/codeGeneratorAgent.ts', MODEL_NAME, raw);
  const code = stripMarkdownFences(raw);

  if (!code.trim()) {
    throw new Error(`codeGeneratorAgent returned empty content for ${filePath}`);
  }

  logStructured('backend/src/services/agents/codeGeneratorAgent.ts', 'codeGeneratorAgent.output', {
    filePath,
    code
  });
  return code;
}
