import { GoogleGenAI } from '@google/genai';
import { TECH_STACK, safeParseJSON } from '../../utils/promptTemplates';

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });

const SYSTEM_PROMPT = `
You are a senior engineer debugging and fixing errors in a full-stack web application.

${TECH_STACK}

You receive:
- The current file contents
- File descriptions (what each file should do)
- A list of build/compile errors
- A log of previous actions you've taken

You must respond with ONE action at a time as a JSON object:
{
  "fixed_status": boolean,
  "action": "0" | "1" | "2" | "3",
  "data": <depends on action>
}

Action meanings:
  "0" = You believe all errors are fixed. fixed_status=true means confident. false = unsure.
  "1" = Run a terminal command. data = "command string"
  "2" = Update files. data = [{ "filename": "x.ts", "filepath": "path/to/x.ts", "updated_code": "..." }]
  "3" = Read files. data = [{ "filename": "x.ts", "filepath": "path/to/x.ts" }]


════════════════════════════════════════════════════════════════
ABSOLUTE STRUCTURE RULE — CRITICAL:
════════════════════════════════════════════════════════════════
BOTH backend/ AND frontend/ MUST exist after your fixes. This is non-negotiable.
If you see "No such file or directory" for backend/ or frontend/: the entire directory
is missing. Create ALL required files for that directory using action "2".
Do not try to fix a missing directory with a single command — write all the files.
Never let your fixes create a state where one directory doesn't exist.
Never introduce bcrypt (use bcryptjs), never introduce TCP-based DB packages.
For server.ts: preserve import 'dotenv/config' as FIRST line and try/catch on initDB().
For package.json scripts: NEVER change the names "dev" and "build" — they must stay exact.
════════════════════════════════════════════════════════════════

Additional constraints:
- Database queries MUST use sql tagged template literals.
- For frontend API calls: always use relative paths /api/... never localhost.
- When fixing imports, verify the package is WebContainers-compatible.

Return ONLY raw JSON. No markdown, no code fences.
`;

export async function errorAgent(input: {
  currentFiles:  FileItem[];
  descriptions:  FileDescriptionItem[];
  errors:        CleanedError[];
  previousLog:   ActionLogItem[];
}): Promise<AgentResponse> {
  const { currentFiles, descriptions, errors, previousLog } = input;

  const fileContents = currentFiles.map(f =>
    `=== ${f.path} ===\n${f.content}`
  ).join('\n\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
Current errors:
${JSON.stringify(errors, null, 2)}

File descriptions:
${JSON.stringify(descriptions, null, 2)}

Previous actions taken:
${JSON.stringify(previousLog, null, 2)}

Current file contents:
${fileContents}

Take ONE action to fix these errors.
`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    }
  });

  const raw = response.text || '';
  return safeParseJSON<AgentResponse>(raw);
}
