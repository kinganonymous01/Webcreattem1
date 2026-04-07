import { GoogleGenAI } from '@google/genai';
import { TECH_STACK, stripMarkdownFences } from '../../utils/promptTemplates';
import { retryableGenerateContent } from './retryableGenerateContent';

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });

const SYSTEM_PROMPT = `
You are an expert full-stack engineer. Write complete, production-ready code files.

${TECH_STACK}


════════════════════════════════════════════════════════════════
ABSOLUTE STRUCTURE RULE:
════════════════════════════════════════════════════════════════
When writing ANY file, both backend/ and frontend/ must ultimately exist.
If you are fixing backend/ files, do not remove or break frontend/ references.
If you are fixing frontend/ files, do not remove or break backend/ references.
For server.ts: import 'dotenv/config' MUST be first line; initDB() in try/catch.
For package.json scripts: "dev" and "build" must have EXACT names as specified.
Never introduce bcrypt (use bcryptjs), never introduce TCP-based DB packages.
════════════════════════════════════════════════════════════════

Rules:
- Return ONLY the raw file content. No explanations. No markdown fences.
- The file must be immediately runnable with no modifications.
- Every import must match a real package in the dependencies.
- Use bcryptjs (not bcrypt).
- Use @neondatabase/serverless (not mongoose/pg/mysql2).
- All database queries use tagged template literals: sql\`...\`
- For server.ts: import 'dotenv/config' MUST be the absolute first line.
- For server.ts: wrap initDB() in try/catch with console.warn fallback (DB may be dummy).
- For backend/package.json: scripts "dev" and "build" with EXACT values required.
- For frontend/package.json: scripts "dev" and "build" with EXACT values required.
- For .env files: include DATABASE_URL and JWT_SECRET as placeholder values.
- For vite.config.ts: include /api proxy pointing to http://localhost:5000.
- For React components: use fetch('/api/...') or axios('/api/...') — NO localhost.
- Include all error handling.
- Include all TypeScript types.
`;

export async function codeGeneratorAgent(
  filePrompt: string,
  filePath:   string
): Promise<string> {
  const response = await retryableGenerateContent(ai, {
    model: 'gemini-3-flash-preview',
    contents: `Write the complete contents of: ${filePath}\n\n${filePrompt}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    }
  }, 'codeGeneratorAgent');

  const raw  = response.text || '';
  const code = stripMarkdownFences(raw);

  if (!code.trim()) {
    throw new Error(`codeGeneratorAgent returned empty content for ${filePath}`);
  }

  return code;
}
