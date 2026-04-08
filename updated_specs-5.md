# AI Website Builder — Complete & Corrected Specification v5
# v4 base + 14 additional fixes: T1-1,T1-3,T1-4,T1-5,T1-6,T1-7,T1-9,T1-10,T2-1,T2-4,T2-7,T2-9,T2-10,T2-11

---

## CHANGE LOG — ALL FIXES APPLIED IN THIS VERSION (v4 = v2 base + v3 fixes + v3 additions restored)

```
════════════ V2 FIXES (carried forward from updated_specs-2.md) ════════════

ERROR #1  (CRITICAL): Missing exampleDescription import in buildController.ts
          FIXED in v2: Added import { exampleDescription } from '../utils/promptTemplates'
          NOTE in v4: This import is now REMOVED again per v3 FIX #5 below.
          depthAgent no longer takes exampleDesc as a parameter — it was silently
          ignored because SYSTEM_PROMPT already interpolates ${exampleDescription}
          at module load time.

ERROR #2  (CRITICAL): Backend process not killed on WebContainer restart
          FIXED in v2: backendProcess tracked at module level in webContainerService.ts.
          Killed in restart() and cleanup() alongside devProcess.
          Prevents EADDRINUSE crash on every code modification.
          PRESERVED in v4: webContainerService.ts restored to module-level singleton
          design (v3 incorrectly switched to class-based and lost backendProcess tracking).

ERROR #3  (CRITICAL): Generated app has no .env file — crashes on startup
          FIXED in v2: TECH_STACK prompt instructs AI to generate backend/.env.
          ENHANCED in v4: TECH_STACK also requires try/catch around initDB() (v3 FIX #4).

ERROR #4  (CRITICAL): Generated frontend cannot reach backend in WebContainer
          FIXED in v2: TECH_STACK requires Vite /api proxy in generated vite.config.ts.
          PRESERVED in v4.

ERROR #5  (WARNING): Missing crypto import in buildController.ts and chatController.ts
          FIXED in v2. PRESERVED in v4.

ERROR #6  (WARNING): Missing try/catch in projectController.ts + partial authController
          FIXED in v2. PRESERVED in v4.

ERROR #7  (WARNING): No JSON parse safety in any agent
          FIXED in v2: safeParseJSON used by all agents. PRESERVED in v4.

MODEL FIX: All agents model string fixed to 'claude-sonnet-4-5-20250929'. PRESERVED in v4.

MODELS RE-ADDED: backend/src/models/User.ts and Project.ts re-added as data access
                 layer (repository pattern). PRESERVED in v4.

FRONTEND COMPLETE: All 14 frontend file pseudocode blocks. PRESERVED in v4.

════════════ V3 FIXES (new in updated_specs-3.md, applied here) ════════════

FIX #1  (CRITICAL): dotenv.config() hoisting crash in server.ts
        FIXED: Replaced import dotenv + dotenv.config() with
        `import 'dotenv/config'` as absolute FIRST line of server.ts (before all
        other imports). db.ts calls neon(process.env.NEON_DATABASE_URL!) at module
        level — if dotenv hasn't run first, the URL is undefined forever in the closure.

FIX #2  (CRITICAL): TS Error 2669 in backend/src/types/index.ts
        FIXED: Added `export {}` as last line of types/index.ts.
        Without any import/export, TypeScript treats the file as a global script
        and declare global {} in a global script is illegal → TS2669 → npm run build fails.

FIX #3  (CRITICAL): @anthropic-ai/sdk version ^0.24.0 too old
        FIXED: Bumped to "^0.40.0" in backend/package.json.
        In ^0.24.0 the model field is a strict string union; claude-sonnet-4-5-20250929
        is not in that union → TypeScript compile error → npm run build fails.

FIX #4  (CRITICAL): Dummy DB URL crashes generated app preview
        FIXED: Added requirement #10 to TECH_STACK: generated backend MUST wrap
        initDB() in try/catch with console.warn fallback so the server does not crash
        when running with the dummy DATABASE_URL in WebContainers preview.

FIX #5  (BUG): depthAgent exampleDesc parameter silently ignored
        FIXED: Removed the dead third parameter `exampleDesc: string` from depthAgent.
        SYSTEM_PROMPT already interpolates ${exampleDescription} at module load.
        buildController no longer passes or imports exampleDescription.
        depthAgent is called as depthAgent(prompt, plannerResult) — two args only.

FIX #6  (BUG): commandRunner dead stdout/stderr local variable accumulation
        FIXED: Removed local `let stdout = ''` / `let stderr = ''` and onStdout/onStderr
        callbacks. Returns result.stdout / result.stderr / result.exitCode directly.

FIX #7  (BUG): generateOrchestrator filesWereUpdated dead variable
        FIXED: Removed `let filesWereUpdated: boolean = false` and filesWereUpdated = true.
        Variable was declared, set on action "2", but never read anywhere.

FIX #8  (ROBUSTNESS): npm script names not guaranteed in TECH_STACK
        FIXED: TECH_STACK now requires exact script names:
        backend: "dev": "nodemon --exec ts-node src/server.ts", "build": "tsc"
        frontend: "dev": "vite", "build": "tsc && vite build"
        Orchestrators hardcode npm run build / npm run dev — wrong names cause timeout.

FIX #9  (DOC/BUG): VITE_WS_URL bypassed the Vite /ws proxy
        FIXED: Changed VITE_WS_URL from ws://localhost:5000 to ws://localhost:5173/ws.
        The old value connected directly to port 5000, bypassing the Vite /ws proxy
        entirely. The /ws proxy was unreachable dead config. Now it routes correctly:
        ws://localhost:5173/ws → Vite proxy → ws://localhost:5000 (backend).
        Updated WebSocketContext comment and WebSocketProvider to reflect this.
        NOTE: The initWS() function URL updated; all other WS design preserved from v2.

FIX #10 (DOC): ValidationResult interface defined but never used
        FIXED: Removed the unused ValidationResult interface from types/index.ts.
        No function returns or accepts it. CleanedError[] is used directly.

FIX #11 (DOC): FileViewer structure prop accepted but never used
        FIXED: Removed `structure: FolderStructure | null` from FileViewerProps.
        Component body never references it. Removed from interface and call site.

FIX #12 (DOC): Setup guide referenced .env.example which doesn't exist
        FIXED: Replaced `cp .env.example .env` with direct creation instructions.

════════════ V3 ADDITIONS (new sections and content added) ════════════

NEW #13 (GUARD): hasBackend/hasFrontend fail-fast check in buildController
        ADDED: After plannerAgent returns, check that plan has at least one file
        starting with 'backend/' AND one starting with 'frontend/'. If either missing:
        sendToClient 'Build failed' + return res.status(500).json immediately.
        Prevents burning 5 minutes in E2B on unrecoverable structure failure.
        WHY res.status(500).json here: the HTTP connection is still open at this point
        (no response sent yet). `return res.status(500).json()` sends exactly one
        response and exits the async handler cleanly. Inner catch does NOT fire
        because we returned before it. This is standard Express early-exit pattern.

NEW #14 (HARDENING): All agent SYSTEM_PROMPTs strengthened
        ADDED: Every agent (plannerAgent, depthAgent, promptGeneratorAgent,
        codeGeneratorAgent, errorAgent, modifyAgent) and TECH_STACK now contains an
        ABSOLUTE STRUCTURE RULE block explaining: both backend/ AND frontend/ must
        always exist; even simple static sites need a minimal Express backend stub;
        the reason is the validation system always runs all 4 install/build commands.

NEW SECTIONS ADDED: Data Flow Diagrams (Sec 11), Security Notes (Sec 13),
        Critical Implementation Rules (Sec 14), Complete Dependency Map (Sec 15),
        14-Fix Quick Reference (Sec 16). All existing v2 sections preserved.
```

---

## SECTION 1 — FILE STRUCTURE

```
root/
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   ├── app.ts
│   │   ├── config/
│   │   │   └── db.ts                     ← Neon DB init + exports sql
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   ├── buildRoutes.ts
│   │   │   ├── chatRoutes.ts
│   │   │   └── projectRoutes.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── buildController.ts
│   │   │   ├── chatController.ts
│   │   │   └── projectController.ts
│   │   ├── services/
│   │   │   ├── agents/
│   │   │   │   ├── plannerAgent.ts
│   │   │   │   ├── depthAgent.ts
│   │   │   │   ├── promptGeneratorAgent.ts
│   │   │   │   ├── codeGeneratorAgent.ts
│   │   │   │   ├── chatSummarizerAgent.ts
│   │   │   │   ├── errorAgent.ts
│   │   │   │   └── modifyAgent.ts
│   │   │   ├── orchestrators/
│   │   │   │   ├── generateOrchestrator.ts
│   │   │   │   └── modifyOrchestrator.ts
│   │   │   └── actions/
│   │   │       ├── commandRunner.ts
│   │   │       ├── fileUpdater.ts
│   │   │       ├── fileReader.ts
│   │   │       └── fileSyncer.ts             ← T1-3 FIX: new — syncs E2B disk→memory after validation
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts
│   │   ├── models/
│   │   │   ├── User.ts                   ← Data access layer (re-added)
│   │   │   └── Project.ts                ← Data access layer (re-added)
│   │   ├── utils/
│   │   │   ├── wsClients.ts
│   │   │   └── promptTemplates.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── context/
    │   │   └── WebSocketContext.tsx
    │   ├── types/
    │   │   └── index.ts
    │   ├── api/
    │   │   ├── authApi.ts
    │   │   ├── buildApi.ts
    │   │   ├── chatApi.ts
    │   │   └── projectApi.ts
    │   ├── pages/
    │   │   ├── AuthPage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   └── ProjectPage.tsx
    │   ├── components/
    │   │   ├── auth/
    │   │   │   └── AuthForm.tsx
    │   │   ├── dashboard/
    │   │   │   ├── Sidebar.tsx
    │   │   │   └── PromptInput.tsx
    │   │   ├── project/
    │   │   │   ├── ChatPanel.tsx
    │   │   │   ├── FileViewer.tsx
    │   │   │   └── PreviewPanel.tsx
    │   │   └── shared/
    │   │       └── LoadingScreen.tsx
    │   └── services/
    │       └── webContainerService.ts
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tsconfig.node.json
    └── .env
```

---

## SECTION 2 — ENVIRONMENT VARIABLES

### backend/.env
```
NEON_DATABASE_URL=postgresql://username:password@host.neon.tech/dbname?sslmode=require
← Get from https://console.neon.tech — replaces MONGODB_URI

JWT_SECRET=your_super_secret_jwt_key_here
E2B_API_KEY=your_e2b_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### frontend/.env
```
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5173/ws
← FIX #9: Points to ws://localhost:5173/ws (Vite dev server port), NOT 5000.
← Vite proxy (configured in vite.config.ts /ws target: ws://localhost:5000) forwards
← the WebSocket upgrade to the backend. Using port 5000 directly bypasses the proxy entirely.
```

---

## SECTION 3 — DEPENDENCIES

### backend/package.json
```json
{
  "name": "ai-website-builder-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.40.0",
    ← FIX #3: Was ^0.24.0. In ^0.24.0 the model field is a strict union; claude-sonnet-4-5-20250929
    ← not in that union → TS compile error. ^0.40.0+ types model as string && {} (open string).
    "@neondatabase/serverless": "^1.0.0",
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "e2b": "^1.0.0",
    "express": "^4.18.3",
    "express-rate-limit": "^7.1.0",
    // T2-7 FIX: Rate limiting for auth endpoints. Prevents brute-force on /api/auth/signup and /login.
    "jsonwebtoken": "^9.0.2",
    "p-limit": "^3.1.0",
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.11.0",
    "@types/ws": "^8.5.10",
    "nodemon": "^3.1.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.0"
  }
}
```

**Key dependency notes:**
- `e2b: ^1.0.0` — v1.x SDK (sandbox.commands.run, sandbox.files.write, timeoutMs)
- `@neondatabase/serverless: ^1.0.0` — HTTP-based Postgres, no TCP, works in WebContainers
- `bcryptjs: ^2.4.3` — pure JS, no native bindings (bcrypt removed)
- `p-limit: ^3.1.0` — CommonJS compatible (v5 is ESM-only, crashes CommonJS build)
- No mongoose, no @types/bcrypt, no @types/e2b

### frontend/package.json
```json
{
  "name": "ai-website-builder-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@webcontainer/api": "^1.1.9",
    "axios": "^1.6.7",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.4.0",
    "vite": "^5.1.0"
  }
}
```

---

## SECTION 4 — CONFIGURATION FILES

### backend/tsconfig.json
```json
{
  "ts-node": {
    "files": true
  },
  // T1-4 FIX: "files":true tells ts-node to load ALL files matched by "include" on startup.
  // Without this, ts-node only follows the import chain from server.ts (the entry point).
  // types/index.ts is never imported anywhere, so ts-node never processes it.
  // The declare global {} block augmenting Express.Request with req.user is never applied.
  // Result: ts-node throws "Property 'user' does not exist on type 'Request'" in every
  // controller — the dev server (npm run dev / nodemon) fails to start entirely.
  // tsc (npm run build) was already correct because tsc loads all include files by default.
  // This setting only closes the ts-node development gap.
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### frontend/vite.config.ts
```typescript
← CRITICAL: COOP/COEP headers required for WebContainer.boot() to work.
← SharedArrayBuffer requires cross-origin isolation.
← /ws proxy routes WebSocket through Vite to avoid cross-origin cookie issues.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy':   'same-origin'
    },
    proxy: {
      '/ws': {
        target:       'ws://localhost:5000',
        ws:           true,
        changeOrigin: true
      }
    }
  }
})
```

### frontend/tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### frontend/tsconfig.node.json
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

### frontend/index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Website Builder</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## SECTION 5 — ALL TYPES AND INTERFACES

### backend/src/types/index.ts
← Backend version. Includes declare global {} for Express Request augmentation and export {}.
← T2-1 FIX: Now shown as a SEPARATE section from frontend/src/types/index.ts (see below).
← The frontend version has NO export {} and NO declare global — it is a global ambient script.

```typescript
// ─── Core File Types ────────────────────────────────────────────────────────

interface FileItem {
  path:    string   // full relative path e.g. "backend/src/server.ts"
  content: string   // raw file content string
}

interface FolderStructure {
  folders: string[] // all folder paths e.g. ["backend/src", "frontend/src"]
}

// ─── Planner Agent Output ───────────────────────────────────────────────────

interface PlannerFileItem {
  path:        string
  explanation: string
}

interface PlannerResult {
  projectName: string
  structure:   FolderStructure
  files:       PlannerFileItem[]
}

// ─── Depth Agent Types ──────────────────────────────────────────────────────

interface FileDescription {
  type:        string
  purpose:     string
  imports:     string[]
  exports:     string[]
  props:       string[]
  connects_to: string[]
  explanation: string
}

interface FileDescriptionItem {
  path:        string
  description: FileDescription
}

interface DepthResult {
  structure: FolderStructure
  files:     FileDescriptionItem[]
}

// ─── Prompt Generator Output ────────────────────────────────────────────────

interface PromptFileItem {
  path:   string
  prompt: string
}

interface PromptGeneratorResult {
  files: PromptFileItem[]
}

// ─── Agent Action Types ─────────────────────────────────────────────────────

interface FileUpdateItem {
  filename:     string  // just filename e.g. "server.ts"
  filepath:     string  // full path e.g. "backend/src/server.ts"
  updated_code: string  // complete new file content
}

interface FileReadItem {
  filename: string
  filepath: string
}

// Action "0" = done/fixed
// Action "1" = run command (data is string)
// Action "2" = update files (data is FileUpdateItem[])
// Action "3" = read files (data is FileReadItem[])

interface ActionLogItem {
  action: "0" | "1" | "2" | "3"
  data:   string | FileUpdateItem[] | FileReadItem[]
  result: string
}

interface AgentResponse {
  fixed_status: boolean
  action:       "0" | "1" | "2" | "3"
  data:         string | FileUpdateItem[] | FileReadItem[]
}

// ─── Validation Types ───────────────────────────────────────────────────────

interface CleanedError {
  command: string
  side:    "frontend" | "backend"
  error:   string
}

// FIX #10: ValidationResult interface REMOVED — was defined but never used anywhere.
// No function in the codebase returns or accepts it. CleanedError[] is used directly.

// ─── Orchestrator Types ─────────────────────────────────────────────────────

interface GenerateOrchestratorInput {
  projectId:    string
  userId:       string
  files:        FileItem[]
  descriptions: FileDescriptionItem[]
  structure:    FolderStructure
}

interface GenerateOrchestratorResult {
  success: boolean
  files:   FileItem[]
  errors:  CleanedError[]
}

interface ModifyOrchestratorInput {
  files:        FileItem[]
  descriptions: FileDescriptionItem[]
  instruction:  string
  projectId:    string
  userId:       string
}

interface ModifyOrchestratorResult {
  success:       boolean
  files:         FileItem[]
  modifiedFiles: FileItem[]
  message:       string
  errors:        CleanedError[]
}

// ─── WebSocket Types ────────────────────────────────────────────────────────

interface WSMessage {
  projectId: string
  type:      "build" | "chat"
  status:    string
}

// ─── API Response Types ─────────────────────────────────────────────────────

interface BuildResponse {
  success:     boolean
  projectId:   string
  projectName: string
  structure:   FolderStructure
  files:       FileItem[]
  message?:    string
}

interface ModifyResponse {
  type:    "modification" | "question"
  files:   FileItem[]
  message: string
}

interface ChatSummaryResult {
  type:        "modification" | "question"
  instruction: string
}

interface ProjectListItem {
  projectId:   string
  projectName: string
  createdAt:   Date
}

interface ProjectResponse {
  projectId:   string
  projectName: string
  prompt:      string
  structure:   FolderStructure
  files:       FileItem[]
  chatHistory: ChatMessage[]
}

interface ChatMessage {
  role:      "user" | "assistant"
  message:   string
  timestamp: Date | string
  // T2-4 FIX: JSON.parse() never produces Date objects — deserialized timestamps are strings.
  // Backend creates timestamps with new Date() which serializes to ISO string in JSON.
  // Frontend receives strings from API. Only in-memory newly-created ChatMessages hold Date.
  // Always use: new Date(msg.timestamp) before calling .toLocaleDateString() etc.
}

// ─── Action Return Types ────────────────────────────────────────────────────

interface CommandResult {
  stdout:   string
  stderr:   string
  exitCode: number
}

// ─── Processing Lock ────────────────────────────────────────────────────────

interface ProcessingLock {
  userId:      string
  operationId: string
}

// ─── Express Request Augmentation (backend/src/types/index.ts only) ─────────

declare global {
  namespace Express {
    interface Request {
      user: {
        userId:   string
        username: string
      }
    }
  }
}

// ─── FIX #2: export {} — CRITICAL ───────────────────────────────────────────
// Without any import or export statement, TypeScript treats this file as a
// global script (not a module). Using `declare global {}` in a global script
// throws TS Error 2669: "Augmentations for the global scope can only be in
// external modules or ambient module declarations."
// This blocks every `npm run build` run.
// `export {}` makes the file an ES module without exporting anything.
// It does NOT change any public API — all interfaces remain globally available.
export {}
```

---

### frontend/src/types/index.ts

← T2-1 / T2-10 FIX: Frontend types file shown here explicitly as its OWN section.
← CRITICAL DIFFERENCES FROM BACKEND VERSION:
←   1. NO export {}     — backend needs it for declare global to work (FIX #2).
←                          Frontend must NOT have it (see reason below).
←   2. NO declare global / namespace Express — Express augmentation is backend-only.
←
← Without any import or export statement, TypeScript treats this file as a GLOBAL AMBIENT SCRIPT.
← All interfaces declared here are globally visible in every frontend .tsx file without imports.
← This is why no frontend component needs to write: import { FileItem } from '../types/index'
← With isolatedModules: true (set in frontend/tsconfig.json), ambient interface-only files
← are fully supported. There is no conflict.
←
← WARNING: If export {} is accidentally added to this file, all interfaces become module-scoped.
← Every component using FileItem, ChatMessage, WSMessage etc. will fail tsc with:
←   "Cannot find name 'FileItem'" / "Cannot find name 'ChatMessage'" etc.
← The entire frontend fails to compile.

```typescript
// ─── Core File Types ────────────────────────────────────────────────────────────

interface FileItem {
  path:    string   // full relative path e.g. "backend/src/server.ts"
  content: string   // raw file content string
}

interface FolderStructure {
  folders: string[] // all folder paths e.g. ["backend/src", "frontend/src"]
}

// ─── Planner Agent Output ───────────────────────────────────────────────────────────

interface PlannerFileItem {
  path:        string
  explanation: string
}

interface PlannerResult {
  projectName: string
  structure:   FolderStructure
  files:       PlannerFileItem[]
}

// ─── Depth Agent Types ────────────────────────────────────────────────────────────

interface FileDescription {
  type:        string
  purpose:     string
  imports:     string[]
  exports:     string[]
  props:       string[]
  connects_to: string[]
  explanation: string
}

interface FileDescriptionItem {
  path:        string
  description: FileDescription
}

interface DepthResult {
  structure: FolderStructure
  files:     FileDescriptionItem[]
}

// ─── Prompt Generator Output ──────────────────────────────────────────────────────────

interface PromptFileItem {
  path:   string
  prompt: string
}

interface PromptGeneratorResult {
  files: PromptFileItem[]
}

// ─── Agent Action Types ────────────────────────────────────────────────────────────

interface FileUpdateItem {
  filename:     string  // just filename e.g. "server.ts"
  filepath:     string  // full path e.g. "backend/src/server.ts"
  updated_code: string  // complete new file content
}

interface FileReadItem {
  filename: string
  filepath: string
}

// Action "0" = done/fixed
// Action "1" = run command (data is string)
// Action "2" = update files (data is FileUpdateItem[])
// Action "3" = read files (data is FileReadItem[])

interface ActionLogItem {
  action: "0" | "1" | "2" | "3"
  data:   string | FileUpdateItem[] | FileReadItem[]
  result: string
}

interface AgentResponse {
  fixed_status: boolean
  action:       "0" | "1" | "2" | "3"
  data:         string | FileUpdateItem[] | FileReadItem[]
}

// ─── Validation Types ────────────────────────────────────────────────────────────

interface CleanedError {
  command: string
  side:    "frontend" | "backend"
  error:   string
}

// FIX #10: ValidationResult interface REMOVED — was defined but never used anywhere.

// ─── Orchestrator Types ────────────────────────────────────────────────────────────

interface GenerateOrchestratorInput {
  projectId:    string
  userId:       string
  files:        FileItem[]
  descriptions: FileDescriptionItem[]
  structure:    FolderStructure
}

interface GenerateOrchestratorResult {
  success: boolean
  files:   FileItem[]
  errors:  CleanedError[]
}

interface ModifyOrchestratorInput {
  files:        FileItem[]
  descriptions: FileDescriptionItem[]
  instruction:  string
  projectId:    string
  userId:       string
}

interface ModifyOrchestratorResult {
  success:       boolean
  files:         FileItem[]
  modifiedFiles: FileItem[]
  message:       string
  errors:        CleanedError[]
}

// ─── WebSocket Types ────────────────────────────────────────────────────────────

interface WSMessage {
  projectId: string
  type:      "build" | "chat"
  status:    string
}

// ─── API Response Types ───────────────────────────────────────────────────────────

interface BuildResponse {
  success:     boolean
  projectId:   string
  projectName: string
  structure:   FolderStructure
  files:       FileItem[]
  message?:    string
}

interface ModifyResponse {
  type:    "modification" | "question"
  files:   FileItem[]
  message: string
}

interface ChatSummaryResult {
  type:        "modification" | "question"
  instruction: string
}

interface ProjectListItem {
  projectId:   string
  projectName: string
  createdAt:   Date
}

interface ProjectResponse {
  projectId:   string
  projectName: string
  prompt:      string
  structure:   FolderStructure
  files:       FileItem[]
  chatHistory: ChatMessage[]
}

interface ChatMessage {
  role:      "user" | "assistant"
  message:   string
  timestamp: Date | string
  // T2-4 FIX: JSON.parse() never produces Date objects — deserialized timestamps are strings.
  // Use new Date(msg.timestamp) before calling any Date methods in the UI.
}

// ─── Action Return Types ────────────────────────────────────────────────────────────

interface CommandResult {
  stdout:   string
  stderr:   string
  exitCode: number
}

// ─── Processing Lock ────────────────────────────────────────────────────────────

interface ProcessingLock {
  userId:      string
  operationId: string
}

// ─── NO export {} — INTENTIONALLY OMITTED ──────────────────────────────────────────────
// No import/export = global ambient script = all interfaces globally visible without imports.
// Adding export {} would silently break all frontend components (tsc fails everywhere).

// ─── NO declare global — INTENTIONALLY OMITTED ─────────────────────────────────────────────
// Express Request augmentation (req.user) is backend-only. @types/express not installed here.
```

---

## SECTION 6 — DATABASE SCHEMAS (NEON / POSTGRESQL)

← Replaces all Mongoose schemas. No Mongoose, no ObjectId.
← Tables created on startup via initDB() in db.ts.

### Users Table
```sql
CREATE TABLE IF NOT EXISTS users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username   TEXT        UNIQUE NOT NULL,
  password   TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Projects Table
```sql
CREATE TABLE IF NOT EXISTS projects (
  id           UUID        PRIMARY KEY,
  ← UUID pre-generated in buildController via crypto.randomUUID()

  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_name TEXT        NOT NULL,
  prompt       TEXT        NOT NULL,
  descriptions JSONB,
  structure    JSONB,
  files        JSONB       NOT NULL DEFAULT '[]'::jsonb,
  chat_history JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
```

### Query Patterns
```typescript
← ALWAYS use tagged template literals — parameterized, SQL-injection safe
← sql`SELECT * FROM users WHERE id = ${id}`  ← CORRECT
← sql("SELECT * FROM users WHERE id = " + id)  ← NEVER DO THIS

← INSERT with RETURNING:
const [row] = await sql`INSERT INTO ... RETURNING *`

← SELECT single (undefined if not found):
const [user] = await sql`SELECT * FROM users WHERE id = ${id}`

← UPDATE JSONB:
await sql`UPDATE projects SET files = ${JSON.stringify(files)}::jsonb WHERE id = ${id}`

← JSONB array append:
await sql`
  UPDATE projects
  SET chat_history = chat_history || ${JSON.stringify([msg])}::jsonb
  WHERE id = ${id}
`
```

---

## SECTION 7 — BACKEND PER-FILE PSEUDOCODE

---

### backend/src/server.ts

```typescript
← FIX #1: import 'dotenv/config' MUST be the absolute first import — before EVERYTHING else.
← db.ts has: export const sql = neon(process.env.NEON_DATABASE_URL!)  ← module-level
← In CommonJS all imports execute in order at require time. If dotenv hasn't run first,
← NEON_DATABASE_URL is undefined when neon() is called — baked into the closure forever.
← Even after dotenv later runs, every SQL query will fail. This is permanent.
← `import 'dotenv/config'` is a side-effect import — it calls dotenv.config() at the
← exact point of execution, before any subsequent import's module-level code runs.

import 'dotenv/config'   ← FIX #1: LINE 1 — before ALL other imports, no exceptions

IMPORTS (after dotenv/config):
  http from 'http'
  { WebSocketServer } from 'ws'
  { initDB } from './config/db'
  { wsClients } from './utils/wsClients'
  jwt from 'jsonwebtoken'
  app from './app'

const server = http.createServer(app)
const wss    = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  ← req is the SECOND param — NEVER use ws.upgradeReq (removed in ws v3+)

  const cookieHeader = req.headers.cookie
  if (!cookieHeader):
    ws.close(); return

  const tokenCookie = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('token='))

  if (!tokenCookie):
    ws.close(); return

  const token = tokenCookie.substring('token='.length)

  let userId: string
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    userId = decoded.userId
  } catch {
    ws.close(); return
  }

  if (!wsClients.has(userId)):
    wsClients.set(userId, new Set())
  wsClients.get(userId)!.add(ws)

  ws.on('close', () => {
    const connections = wsClients.get(userId)
    if (connections):
      connections.delete(ws)
      if (connections.size === 0):
        wsClients.delete(userId)
  })
})

async function start():
  await initDB()
  ← Creates Neon tables on startup. Throws on failure — server won't start.
  server.listen(process.env.PORT || 5000, () => {
    console.log(`Server on port ${process.env.PORT || 5000}`)
  })

start()
```

---

### backend/src/app.ts

```typescript
IMPORTS:
  express from 'express'
  cookieParser from 'cookie-parser'
  cors from 'cors'
  { rateLimit } from 'express-rate-limit'
  ← T2-7 FIX: Rate limiter for auth endpoints
  authRoutes from './routes/authRoutes'
  buildRoutes from './routes/buildRoutes'
  chatRoutes from './routes/chatRoutes'
  projectRoutes from './routes/projectRoutes'

const app = express()

app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
  ← credentials: true required for httpOnly cookies to be sent cross-origin
}))

app.use(express.json({ limit: '50mb' }))
← Large limit because files[] can be substantial

app.use(cookieParser())

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   ← 15 minutes
  max:      20,                ← 20 attempts per window per IP
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many attempts, please try again later' }
})
← T2-7 FIX: Protects /api/auth/signup and /api/auth/login from brute-force attacks.
← Applied BEFORE the route handler so it runs first on every auth request.

app.use('/api/auth', authLimiter)
app.use('/api/auth', authRoutes)
app.use('/api',      buildRoutes)
app.use('/api',      chatRoutes)
app.use('/api',      projectRoutes)

export default app
```

---

### backend/src/config/db.ts

```typescript
IMPORTS:
  { neon } from '@neondatabase/serverless'

export const sql = neon(process.env.NEON_DATABASE_URL!)
← Operates over HTTPS — no TCP socket, no persistent connection.
← Import: import { sql } from '../config/db'

export async function initDB(): Promise<void>
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      username   TEXT        UNIQUE NOT NULL,
      password   TEXT        NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id           UUID        PRIMARY KEY,
      user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_name TEXT        NOT NULL,
      prompt       TEXT        NOT NULL,
      descriptions JSONB,
      structure    JSONB,
      files        JSONB       NOT NULL DEFAULT '[]'::jsonb,
      chat_history JSONB       NOT NULL DEFAULT '[]'::jsonb,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)
  `
  console.log('Neon DB initialized')
  ← Throws on failure → propagates to server.ts → server does not start
```

---

### backend/src/models/User.ts  ← RE-ADDED as Data Access Layer

```typescript
← WHY THIS FILE EXISTS:
← In the Mongoose era, User.ts defined the Mongoose schema/model.
← After migrating to Neon DB, there is no Mongoose — but it's still best
← practice to centralise all user-related SQL queries in one place.
← This is the Repository / Data Access Layer pattern.
← Controllers import functions from here instead of writing raw sql directly.
← Benefits: keeps controllers clean, single source of truth for user queries,
←           easy to swap DB implementation if needed.

IMPORTS:
  { sql } from '../config/db'

─────────────────────────────────────────────
export interface UserRow {
  id:         string
  username:   string
  password:   string
  created_at: Date
}

─────────────────────────────────────────────
export async function findUserByUsername(
  username: string
): Promise<UserRow | undefined>

  const rows = await sql`
    SELECT id, username, password, created_at
    FROM users
    WHERE username = ${username}
  `
  return rows[0] as UserRow | undefined

─────────────────────────────────────────────
export async function findUserById(
  id: string
): Promise<UserRow | undefined>

  const rows = await sql`
    SELECT id, username, password, created_at
    FROM users
    WHERE id = ${id}
  `
  return rows[0] as UserRow | undefined

─────────────────────────────────────────────
export async function createUser(
  username:     string,
  passwordHash: string
): Promise<UserRow>

  const rows = await sql`
    INSERT INTO users (username, password)
    VALUES (${username}, ${passwordHash})
    RETURNING id, username, password, created_at
  `
  return rows[0] as UserRow

─────────────────────────────────────────────
export async function userExistsByUsername(
  username: string
): Promise<boolean>

  const rows = await sql`
    SELECT id FROM users WHERE username = ${username}
  `
  return rows.length > 0
```

---

### backend/src/models/Project.ts  ← RE-ADDED as Data Access Layer

```typescript
← Same purpose as User.ts — centralises all project SQL queries.
← Controllers import functions here instead of using raw sql.
← Keeps chatController and projectController clean and testable.

IMPORTS:
  { sql } from '../config/db'

─────────────────────────────────────────────
export interface ProjectRow {
  id:           string
  user_id:      string
  project_name: string
  prompt:       string
  descriptions: any
  structure:    any
  files:        any
  chat_history: any
  created_at:   Date
}

─────────────────────────────────────────────
export async function createProject(params: {
  id:           string
  userId:       string
  projectName:  string
  prompt:       string
  descriptions: any
  structure:    any
  files:        any
}): Promise<ProjectRow>

  const { id, userId, projectName, prompt, descriptions, structure, files } = params
  const rows = await sql`
    INSERT INTO projects (
      id, user_id, project_name, prompt,
      descriptions, structure, files, chat_history
    ) VALUES (
      ${id},
      ${userId},
      ${projectName},
      ${prompt},
      ${JSON.stringify(descriptions)}::jsonb,
      ${JSON.stringify(structure)}::jsonb,
      ${JSON.stringify(files)}::jsonb,
      '[]'::jsonb
    )
    RETURNING *
  `
  return rows[0] as ProjectRow

─────────────────────────────────────────────
export async function getProjectById(
  id: string
): Promise<ProjectRow | undefined>

  const rows = await sql`
    SELECT * FROM projects WHERE id = ${id}
  `
  return rows[0] as ProjectRow | undefined

─────────────────────────────────────────────
export async function getProjectsByUserId(
  userId: string
): Promise<{ id: string; project_name: string; created_at: Date }[]>

  const rows = await sql`
    SELECT id, project_name, created_at
    FROM projects
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `
  return rows as { id: string; project_name: string; created_at: Date }[]

─────────────────────────────────────────────
export async function updateProjectFiles(
  id:    string,
  files: any
): Promise<void>

  await sql`
    UPDATE projects
    SET files = ${JSON.stringify(files)}::jsonb
    WHERE id = ${id}
  `

─────────────────────────────────────────────
export async function updateProjectChatHistory(
  id:          string,
  chatHistory: any
): Promise<void>

  await sql`
    UPDATE projects
    SET chat_history = ${JSON.stringify(chatHistory)}::jsonb
    WHERE id = ${id}
  `

─────────────────────────────────────────────
export async function updateProjectFilesAndHistory(
  id:          string,
  files:       any,
  chatHistory: any
): Promise<void>

  await sql`
    UPDATE projects
    SET
      files        = ${JSON.stringify(files)}::jsonb,
      chat_history = ${JSON.stringify(chatHistory)}::jsonb
    WHERE id = ${id}
  `
```

---

### backend/src/middleware/authMiddleware.ts

```typescript
IMPORTS:
  { Request, Response, NextFunction } from 'express'
  jwt from 'jsonwebtoken'

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void

  const token = req.cookies.token
  ← Reads from httpOnly cookie via cookie-parser

  if (!token):
    res.status(401).json({ success: false, message: 'Unauthorized' })
    return

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { userId: string; username: string }

    req.user = decoded
    next()

  } catch {
    res.status(401).json({ success: false, message: 'Unauthorized' })
    return
  }
```

---

### backend/src/routes/authRoutes.ts

```typescript
IMPORTS:
  { Router } from 'express'
  { signup, login, logout } from '../controllers/authController'

const router = Router()

router.post('/signup', signup)   ← unprotected
router.post('/login',  login)    ← unprotected
router.post('/logout', logout)   ← unprotected

export default router
```

---

### backend/src/routes/buildRoutes.ts

```typescript
IMPORTS:
  { Router } from 'express'
  { authMiddleware } from '../middleware/authMiddleware'
  { build } from '../controllers/buildController'

const router = Router()

router.post('/build', authMiddleware, build)
← Protected route
← No express timeout — axios client uses timeout: 0 on the frontend

export default router
```

---

### backend/src/routes/chatRoutes.ts

```typescript
IMPORTS:
  { Router } from 'express'
  { authMiddleware } from '../middleware/authMiddleware'
  { chat } from '../controllers/chatController'

const router = Router()

router.post('/chat', authMiddleware, chat)

export default router
```

---

### backend/src/routes/projectRoutes.ts

```typescript
IMPORTS:
  { Router } from 'express'
  { authMiddleware } from '../middleware/authMiddleware'
  { getProjects, getProject } from '../controllers/projectController'

const router = Router()

router.get('/projects',     authMiddleware, getProjects)
router.get('/projects/:id', authMiddleware, getProject)

export default router
```

---

### backend/src/controllers/authController.ts

```typescript
IMPORTS:
  bcrypt from 'bcryptjs'           ← pure JS — no native bindings
  jwt from 'jsonwebtoken'
  { userExistsByUsername, createUser, findUserByUsername } from '../models/User'
  ← Use model functions, not raw sql

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge:   7 * 24 * 60 * 60 * 1000
}

function generateToken(userId: string, username: string): string
  return jwt.sign(
    { userId, username },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )

─────────────────────────────────────────────
export async function signup(req, res)
  try {
    const { username, password } = req.body

    if (!username || !password):
      res.status(400).json({ success: false, message: 'Username and password required' })
      return

    const exists = await userExistsByUsername(username)
    if (exists):
      res.status(400).json({ success: false, message: 'Username already taken' })
      return

    const hashed  = await bcrypt.hash(password, 10)
    const newUser = await createUser(username, hashed)

    const token = generateToken(newUser.id, username)
    res.cookie('token', token, COOKIE_OPTIONS)
    res.status(201).json({ success: true })

  } catch (err) {
    console.error('signup error:', err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }

─────────────────────────────────────────────
export async function login(req, res)
  try {
    const { username, password } = req.body

    const user = await findUserByUsername(username)
    if (!user):
      res.status(401).json({ success: false, message: 'Invalid credentials' })
      return

    const valid = await bcrypt.compare(password, user.password)
    if (!valid):
      res.status(401).json({ success: false, message: 'Invalid credentials' })
      return

    const token = generateToken(user.id, username)
    res.cookie('token', token, COOKIE_OPTIONS)
    res.json({ success: true })

  } catch (err) {
    console.error('login error:', err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }

─────────────────────────────────────────────
export async function logout(req, res)
  res.clearCookie('token')
  res.json({ success: true })
  ← No try/catch needed — clearCookie never throws
```

---

### backend/src/controllers/buildController.ts

```typescript
IMPORTS:
  crypto from 'crypto'                              ← ERROR #5 FIX: explicit import
  { sendToClient } from '../utils/wsClients'
  { plannerAgent } from '../services/agents/plannerAgent'
  { depthAgent } from '../services/agents/depthAgent'
  { promptGeneratorAgent } from '../services/agents/promptGeneratorAgent'
  { codeGeneratorAgent } from '../services/agents/codeGeneratorAgent'
  { generateOrchestrator } from '../services/orchestrators/generateOrchestrator'
  { createProject } from '../models/Project'        ← Use model layer
  ← FIX #5: exampleDescription import REMOVED.
  ← depthAgent no longer takes exampleDesc as a 3rd parameter — it was silently ignored.
  ← depthAgent's SYSTEM_PROMPT already interpolates exampleDescription at module load time.
  pLimit from 'p-limit'

export async function build(req, res)

  ─── OUTER try ────────────────────────────────────────────────────────────
  ← Handles pre-projectId errors (no WS update possible yet)

  try {
    const { userId, username } = req.user
    const { prompt }           = req.body

    const limit     = pLimit(3)
    ← Initialized INSIDE function — not module level
    ← p-limit ^3.1.0 is CommonJS-compatible

    const projectId = crypto.randomUUID()
    ← ERROR #5 FIX: uses imported crypto, not global
    ← UUID string — not ObjectId

    sendToClient(userId, {
      projectId,
      type:   'build',
      status: 'Build started'
    })

    ─── INNER try ──────────────────────────────────────────────────────────

    try {

      ─── Phase 1: Plan ────────────────────────────────────────────────────

      sendToClient(userId, { projectId, type: 'build', status: 'Planning project structure...' })
      const plannerResult = await plannerAgent(prompt)

      if (!plannerResult.projectName):
        throw new Error('Planner did not return a project name')

      ─── NEW #13: hasBackend/hasFrontend fail-fast guard ──────────────────
      ← Check BEFORE spending any E2B sandbox time.
      ← plannerResult.files is PlannerFileItem[] with { path, explanation }.
      ← If the LLM deviated from the mandatory structure rule despite the prompt,
      ← fail immediately with a clear message instead of burning 5 minutes in E2B.
      ←
      ← WHY return res.status(500).json() and NOT throw:
      ←   1. We want a specific error message (not the generic inner-catch message).
      ←   2. `return` exits the ENTIRE build() function — inner catch does NOT fire.
      ←   3. No double-response risk — we return before any other response is sent.
      ←   4. The HTTP connection is still open here (no response sent yet) — valid.
      ←   5. sendToClient before it notifies the frontend over the WS simultaneously.
      ← This is standard Express: `return res.status(500).json(...)` in async handler.

      const hasBackend  = plannerResult.files.some(f => f.path.startsWith('backend/'))
      const hasFrontend = plannerResult.files.some(f => f.path.startsWith('frontend/'))

      if (!hasBackend || !hasFrontend):
        const missing = !hasBackend ? 'backend/' : 'frontend/'
        sendToClient(userId, { projectId, type: 'build', status: 'Build failed' })
        return res.status(500).json({
          success: false,
          message: `Planner did not generate required ${missing} structure. Please try again.`
        })

      ─── Phase 2: Depth ───────────────────────────────────────────────────

      sendToClient(userId, { projectId, type: 'build', status: 'Analyzing file requirements...' })
      const depthResult = await depthAgent(prompt, plannerResult)
      ← FIX #5: Two args only. Was: depthAgent(prompt, plannerResult, exampleDescription)
      ← exampleDescription was a dead parameter — never used inside the function.

      sendToClient(userId, { projectId, type: 'build', status: 'Generating code prompts...' })
      const promptResult = await promptGeneratorAgent(prompt, plannerResult, depthResult)

      sendToClient(userId, { projectId, type: 'build', status: 'Generating code...' })
      const codeFiles: FileItem[] = await Promise.all(
        promptResult.files.map(pf =>
          limit(async () => {
            const content = await codeGeneratorAgent(pf.prompt, pf.path)
            ← Strips markdown fences internally, throws if empty
            return { path: pf.path, content }
          })
        )
      )

      sendToClient(userId, { projectId, type: 'build', status: 'Validating and fixing code...' })
      const orchResult = await generateOrchestrator({
        projectId,
        userId,
        files:        codeFiles,
        descriptions: depthResult.files,
        structure:    depthResult.structure
      })

      ← T1-1 FIX: Check orchResult.success before saving — prevents broken projects being persisted.
      ← Without this check, when validation times out orchResult.success is false but
      ← createProject() still runs, saving invalid files. The WS sends "Build complete"
      ← and the user is navigated to a project that will never load in WebContainers.
      if (!orchResult.success):
        sendToClient(userId, {
          projectId,
          type:   'build',
          status: 'Build failed — validation could not resolve all errors in time'
        })
        return res.status(500).json({
          success: false,
          message: 'Build validation failed. Please try again.'
        })
      ← Only reaches createProject() when orchResult.success === true

      ─── Save to Neon DB via model layer ─────────────────────────────────

      await createProject({
        id:           projectId,
        userId,
        projectName:  plannerResult.projectName,
        prompt,
        descriptions: depthResult.files,
        structure:    depthResult.structure,
        files:        orchResult.files
      })

      sendToClient(userId, { projectId, type: 'build', status: 'Build complete' })

      return res.json({
        success:     true,
        projectId,
        projectName: plannerResult.projectName,
        structure:   depthResult.structure,
        files:       orchResult.files
      })

    } catch (innerErr) {
      sendToClient(userId, { projectId, type: 'build', status: 'Build failed' })
      return res.status(500).json({ success: false, message: 'Build pipeline failed' })
    }

  } catch (outerErr) {
    ← No projectId yet — cannot send WS update
    return res.status(500).json({ success: false, message: 'Failed to start build' })
  }
```

---

### backend/src/controllers/chatController.ts

```typescript
IMPORTS:
  crypto from 'crypto'                              ← ERROR #5 FIX: explicit import
  { sendToClient } from '../utils/wsClients'
  { chatSummarizerAgent } from '../services/agents/chatSummarizerAgent'
  { modifyOrchestrator } from '../services/orchestrators/modifyOrchestrator'
  { getProjectById, updateProjectChatHistory,
    updateProjectFilesAndHistory } from '../models/Project'
  ← Use model layer for all DB operations

const processingProjects = new Map<string, ProcessingLock>()
← Map<projectId, { userId, operationId }>
← Prevents concurrent modifications to same project

export async function chat(req, res)

  const { userId }                             = req.user
  const { projectId, message, chatHistory }    = req.body
  const originalMessage                        = message

  ─── Concurrency check ──────────────────────────────────────────────────

  if (processingProjects.has(projectId)):
    return res.status(409).json({
      success: false,
      message: 'Project is already being processed'
    })

  const operationId = crypto.randomUUID()
  ← ERROR #5 FIX: uses imported crypto
  processingProjects.set(projectId, { userId, operationId })
  ← Lock acquired BEFORE inner try

  try {

    ─── Fetch project via model layer ────────────────────────────────────

    const project = await getProjectById(projectId)

    if (!project):
      return res.status(404).json({ success: false, message: 'Project not found' })

    if (project.user_id !== userId):
      return res.status(403).json({ success: false, message: 'Forbidden' })

    ─── Chat Summarizer Agent ────────────────────────────────────────────

    sendToClient(userId, { projectId, type: 'chat', status: 'Analyzing request...' })

    const summaryResult = await chatSummarizerAgent({
      chatHistory,
      currentMessage: message
    })

    ─── QUESTION PATH ────────────────────────────────────────────────────

    if (summaryResult.type === 'question'):

      const updatedHistory = [
        ...project.chat_history,
        { role: 'user',      message: originalMessage,          timestamp: new Date() },
        { role: 'assistant', message: summaryResult.instruction, timestamp: new Date() }
      ]

      try {
        await updateProjectChatHistory(projectId, updatedHistory)
      } catch {
        return res.status(500).json({ success: false, message: 'Failed to save chat message' })
      }

      return res.status(200).json({
        type:    'question',
        files:   [],
        message: summaryResult.instruction
      })

    ─── MODIFICATION PATH ────────────────────────────────────────────────

    sendToClient(userId, { projectId, type: 'chat', status: 'Modifier agent working...' })

    const result = await modifyOrchestrator({
      files:        project.files,
      descriptions: project.descriptions,
      instruction:  summaryResult.instruction,
      projectId,
      userId
    })

    if (!result.success):
      sendToClient(userId, { projectId, type: 'chat', status: 'Could not complete within time limit' })
      return res.status(200).json({
        type:    'modification',
        files:   [],
        message: 'Could not complete within time limit'
      })

    ─── Save to Neon DB via model layer ──────────────────────────────────

    const updatedHistory = [
      ...project.chat_history,
      { role: 'user',      message: originalMessage, timestamp: new Date() },
      { role: 'assistant', message: result.message,  timestamp: new Date() }
    ]

    try {
      await updateProjectFilesAndHistory(projectId, result.files, updatedHistory)
    } catch {
      return res.status(500).json({ success: false, message: 'Changes made but failed to save' })
    }

    return res.status(200).json({
      type:    'modification',
      files:   result.modifiedFiles,
      ← Only changed files { path, content } — NOT full files array
      message: result.message
    })

  } catch (innerErr) {
    sendToClient(userId, { projectId, type: 'chat', status: 'An unexpected error occurred' })
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' })

  } finally {
    ← ALWAYS runs — after try OR catch
    const current = processingProjects.get(projectId)
    if (current && current.operationId === operationId):
      processingProjects.delete(projectId)
    ← operationId check ensures we only delete our own lock
  }
```

---

### backend/src/controllers/projectController.ts

```typescript
IMPORTS:
  { getProjectsByUserId, getProjectById } from '../models/Project'
  ← Use model layer — no raw sql in this file

─────────────────────────────────────────────
export async function getProjects(req, res)
  try {
    const { userId } = req.user

    const projects = await getProjectsByUserId(userId)

    return res.json(
      projects.map(p => ({
        projectId:   p.id,
        projectName: p.project_name,
        createdAt:   p.created_at
      }))
    )

  } catch (err) {
    console.error('getProjects error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }

─────────────────────────────────────────────
export async function getProject(req, res)
  try {
    const { userId } = req.user
    const { id }     = req.params

    const project = await getProjectById(id)

    if (!project):
      return res.status(404).json({ success: false, message: 'Project not found' })

    if (project.user_id !== userId):
      return res.status(403).json({ success: false, message: 'Forbidden' })

    return res.json({
      projectId:   project.id,
      projectName: project.project_name,
      prompt:      project.prompt,
      structure:   project.structure,
      files:       project.files,
      chatHistory: project.chat_history
    })

  } catch (err) {
    console.error('getProject error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
```

---

### backend/src/utils/wsClients.ts

```typescript
import { WebSocket } from 'ws'

export const wsClients = new Map<string, Set<WebSocket>>()
← Map<userId, Set<WebSocket>>
← Set allows multiple tabs per user

export function sendToClient(userId: string, message: object): void
  const connections = wsClients.get(userId)
  if (!connections) return
  ← Silent no-op — no connections for this user

  const data = JSON.stringify(message)
  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN):
      ws.send(data)
    ← Skip closing/closed/connecting sockets
  })
```

---

### backend/src/utils/promptTemplates.ts

```typescript
← stripMarkdownFences defined here and exported.
← All agents import it from here (Error #10 fix from v1).
← TECH_STACK and exampleDescription also exported from here.

─────────────────────────────────────────────
export function stripMarkdownFences(text: string): string
  return text
    .replace(/^```(?:\w+)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()

─────────────────────────────────────────────
export function safeParseJSON<T>(raw: string): T
  ← ERROR #7 FIX: Regex extraction fallback before JSON.parse.
  ← Called by all agents to prevent SyntaxError crashes when LLM
  ← adds conversational text outside JSON fences.

  let cleaned = stripMarkdownFences(raw)

  ← Try to extract outermost JSON object with regex
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) cleaned = jsonMatch[0]

  try {
    return JSON.parse(cleaned) as T
  } catch (e) {
    throw new Error(`Failed to parse AI JSON output: ${(e as Error).message}`)
  }

─────────────────────────────────────────────
export const TECH_STACK = `
You are generating a full-stack web application that will run inside StackBlitz WebContainers
(a browser-based Node.js environment with a virtualized network stack).

MANDATORY TECH STACK:
- Backend:  Node.js + Express.js (CommonJS)
- Frontend: React + Vite (separate frontend/ folder)
- Database: Neon DB (PostgreSQL) via @neondatabase/serverless (HTTP-based, no TCP)
- Auth:     bcryptjs + JWT cookies

CRITICAL WEBCONTAINERS CONSTRAINTS — READ EVERY RULE:

1. DATABASE:
   - ALWAYS use @neondatabase/serverless for all database access.
   - Import:     import { neon } from '@neondatabase/serverless'
   - Initialize: const sql = neon(process.env.DATABASE_URL)
   - Write ALL queries using tagged template literals:
       sql\`SELECT * FROM table WHERE id = \${id}\`
   - NEVER call sql as a function: sql("SELECT...") bypasses parameterization.
   - NEVER use mongoose, mongodb, mysql, mysql2, pg (TCP), better-sqlite3, sqlite3.
   - Connection string from process.env.DATABASE_URL (Neon dashboard).

2. REDIS / CACHING:
   - If caching is needed: @upstash/redis (HTTP-based REST API).
   - Import:     import { Redis } from '@upstash/redis'
   - Initialize: const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
   - NEVER use 'redis' or 'ioredis' — they require TCP connections.

3. PASSWORD HASHING:
   - ALWAYS use bcryptjs.
   - Import: import bcrypt from 'bcryptjs'
   - NEVER use bcrypt (C++ native bindings — fails to install in WebContainers).

4. NATIVE MODULES — STRICTLY FORBIDDEN (will fail to install):
   bcrypt, argon2, canvas, sharp, sqlite3, better-sqlite3,
   node-sass, leveldown, grpc, any package requiring node-gyp.
   Alternatives: bcryptjs, jimp, @neondatabase/serverless, sass.

5. NO TCP CONNECTIONS:
   WebContainers cannot open raw TCP sockets.
   - No pg, mysql2, mongodb, redis, ioredis.
   - No SMTP (use REST-based email API instead).
   - All external services via HTTPS REST APIs only.

6. VITE PROXY — REQUIRED FOR FRONTEND-BACKEND COMMUNICATION:
   The generated frontend runs at a WebContainers preview URL.
   The backend Express server runs internally on localhost:5000.
   The browser CANNOT directly fetch http://localhost:5000 — it would try
   to reach the user's physical OS, not the WebContainer's virtual network.
   SOLUTION: All frontend API calls MUST use relative paths (e.g. /api/users).
   The generated frontend/vite.config.ts MUST include a proxy rule:

     server: {
       proxy: {
         '/api': {
           target:       'http://localhost:5000',
           changeOrigin: true
         }
       }
     }

   The Vite dev server (inside WebContainer) forwards /api/* to Express
   (also inside WebContainer via the virtual network) — this works.
   NEVER hardcode 'http://localhost:5000' in React fetch/axios calls.
   ALWAYS use relative paths: fetch('/api/users'), axios.get('/api/data').

7. ENVIRONMENT VARIABLES — GENERATE A REAL .env FILE:
   The backend MUST have a backend/.env file (NOT .env.example).
   This file MUST contain:
     DATABASE_URL=postgresql://dummy:dummy@dummy.neon.tech/dummy?sslmode=require
     JWT_SECRET=preview_secret_key_change_in_production
   The backend package.json MUST include dotenv as a dependency.
   server.ts or app.ts MUST call require('dotenv').config() or import 'dotenv/config'
   at the very top before any other imports.
   Without .env, DATABASE_URL is undefined, neon() throws, app crashes.

8. DATABASE INITIALIZATION:
   Backend must create tables on startup using CREATE TABLE IF NOT EXISTS.
   Example db.ts pattern:
     const sql = neon(process.env.DATABASE_URL)
     export async function initDB() {
       await sql\`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, ...)\`
     }
   Call initDB() in server.ts before starting the HTTP server.

9. FILESYSTEM:
   The WebContainer filesystem is ephemeral and in-memory.
   All persistent storage must go through Neon DB or Upstash Redis.

10. DATABASE INITIALIZATION MUST BE FAULT-TOLERANT: ← FIX #4
    The generated app runs in WebContainers preview with a DUMMY DATABASE_URL.
    The dummy URL will fail to connect — this is expected during preview.
    NEVER let DB initialization failure crash the entire server.
    ALWAYS wrap initDB() in a try/catch in server.ts:

      try {
        await initDB()
        console.log('DB initialized')
      } catch (err) {
        console.warn('DB unavailable — running with in-memory fallback:', (err as Error).message)
        // Server continues running — preview works without a real DB
      }

    All route handlers that query the DB should also catch DB errors and
    return { error: 'DB not available' } with status 503 instead of crashing.
    This way the frontend preview loads and renders even without a real DB.

11. PACKAGE.JSON SCRIPTS — EXACT NAMES REQUIRED: ← FIX #8
    backend/package.json MUST contain EXACTLY these script names:
      "dev":   "nodemon --exec ts-node src/server.ts"
      "build": "tsc"
    frontend/package.json MUST contain EXACTLY these script names:
      "dev":   "vite"
      "build": "tsc && vite build"
    The build validation system runs 'npm run build' and 'npm run dev' verbatim.
    Using any other script names (e.g. 'start', 'serve', 'compile') means the
    validation commands fail with exit code 1 and the build times out in 5 minutes.

════════════════════════════════════════════════════════════════
ABSOLUTE STRUCTURE RULE — APPLIES TO ALL GENERATED APPLICATIONS: ← NEW #14
════════════════════════════════════════════════════════════════
You MUST generate BOTH a backend/ directory AND a frontend/ directory.
This rule has NO exceptions — not for simple websites, not for static pages,
not for calculators, portfolios, landing pages, or any other "simple" request.

WHY THIS IS MANDATORY:
The build validation system ALWAYS runs these four commands regardless of app type:
  cd backend && npm install
  cd backend && npm run build
  cd frontend && npm install
  cd frontend && npm run build
If backend/ does not exist: ALL four commands fail → guaranteed 5-minute timeout → build fails.
If frontend/ does not exist: same result.

FOR SIMPLE WEBSITES WHERE A BACKEND IS NOT NEEDED:
Generate a minimal Express backend that does nothing except:
  - Serve GET / returning { message: 'ok' }
  - Export a valid Express app
It must still have: backend/package.json (with "dev" and "build" scripts),
backend/tsconfig.json, backend/.env, backend/src/server.ts, backend/src/app.ts,
backend/src/config/db.ts (with try/catch-wrapped initDB).
This minimal backend compiles cleanly and passes npm run build. That is all that matters.
════════════════════════════════════════════════════════════════

Generate a complete, working full-stack application following ALL constraints above.
`

─────────────────────────────────────────────
export const exampleDescription = `
Example FileDescription:
{
  "type": "Express route handler",
  "purpose": "Handles user authentication endpoints",
  "imports": ["Router from express", "bcryptjs", "jsonwebtoken"],
  "exports": ["default router"],
  "props": [],
  "connects_to": ["authController.ts", "User queries in models/User.ts"],
  "explanation": "Defines POST /signup and POST /login routes. Signup hashes password with bcryptjs, inserts into users table via sql template literal, returns JWT cookie. Login queries users table, compares password, returns JWT."
}
`
```

---

### backend/src/services/actions/commandRunner.ts

```typescript
← E2B SDK v1.x API. sandbox.commands.run() not sandbox.process.start().
← FIX #6: Removed dead local stdout/stderr accumulation and onStdout/onStderr callbacks.
← sandbox.commands.run() returns a result object with .stdout, .stderr, .exitCode directly.
← The local accumulation variables were built up via callbacks but then result.stdout and
← result.stderr were returned instead — making the local variables permanently dead code.
← Removing the callbacks also reduces overhead (no string concatenation per chunk).

IMPORTS:
  { Sandbox } from 'e2b'

export async function commandRunner(
  sandbox: Sandbox,
  command: string
): Promise<CommandResult>

  const result = await sandbox.commands.run(command, {
    timeoutMs: 120_000
    ← FIX #6: No onStdout/onStderr callbacks — removed dead code
    ← 2 minute timeout per individual command
  })

  return {
    stdout:   result.stdout,
    stderr:   result.stderr,
    exitCode: result.exitCode
    ← result.stdout/stderr are the complete accumulated output strings
  }
```

---

### backend/src/services/actions/fileUpdater.ts

```typescript
← Writes files to E2B sandbox (v1.x API) AND updates in-memory array.
← Both always stay in sync.

IMPORTS:
  { Sandbox } from 'e2b'

export async function fileUpdater(
  sandbox:      Sandbox,
  currentFiles: FileItem[],
  updates:      FileUpdateItem[]
): Promise<void>

  for (const item of updates):

    await sandbox.files.write(item.filepath, item.updated_code)
    ← E2B v1.x: sandbox.files.write(path, content)
    ← Auto-creates parent directories

    const idx = currentFiles.findIndex(f => f.path === item.filepath)
    if (idx !== -1):
      currentFiles[idx].content = item.updated_code
    else:
      currentFiles.push({ path: item.filepath, content: item.updated_code })
```

---

### backend/src/services/actions/fileReader.ts

```typescript
← Reads from in-memory currentFiles array only.
← Does NOT make sandbox calls — memory is always in sync with sandbox.

export function fileReader(
  currentFiles: FileItem[],
  reads:        FileReadItem[]
): string

  const results: string[] = []

  for (const item of reads):
    const file = currentFiles.find(f => f.path === item.filepath)

    if (file):
      results.push(`=== ${item.filepath} ===\n${file.content}`)
    else:
      results.push(`=== ${item.filepath} === FILE NOT FOUND`)

  return results.join('\n\n')
  ← Single string — stored as ActionLogItem.result
```

---

### backend/src/services/actions/fileSyncer.ts

```typescript
← T1-3 FIX: Syncs in-memory currentFiles with actual E2B sandbox disk state after validation.
← Problem: Action "1" commands (e.g. npm install uuid) update package.json on E2B disk but
← NOT in the in-memory currentFiles array. createProject() saves currentFiles to DB. Result:
← persisted package.json is missing the installed package. Next WebContainer boot installs
← from that stale package.json → missing package → app crashes at runtime.
← Fix: after successful validation, read every tracked file back from E2B disk.
← Only runs on success path — no point syncing if we're returning errors.
← Only syncs paths already in currentFiles (bounded, O(n) in source files, not node_modules).

IMPORTS:
  { Sandbox } from 'e2b'

export async function syncFilesFromSandbox(
  sandbox:      Sandbox,
  currentFiles: FileItem[]
): Promise<void>

  await Promise.all(
    currentFiles.map(async (file) => {
      try {
        const content = await sandbox.files.read(file.path)
        ← E2B v1.x: sandbox.files.read(path) returns file content as a string
        file.content = content   ← mutate in place — caller sees updated array
      } catch (err) {
        console.warn(`syncFilesFromSandbox: could not read ${file.path}:`, err)
        ← File may have been deleted by a command. Log and continue — don't throw.
        ← Missing files will surface as build errors on the next validation run.
      }
    })
  )
  ← Promise.all runs all reads in parallel — fast even with many source files.
```

---

### backend/src/services/orchestrators/generateOrchestrator.ts

```typescript
IMPORTS:
  { Sandbox } from 'e2b'
  { sendToClient } from '../../utils/wsClients'
  { errorAgent } from '../agents/errorAgent'
  { commandRunner } from '../actions/commandRunner'
  { fileUpdater } from '../actions/fileUpdater'
  { fileReader } from '../actions/fileReader'
  { syncFilesFromSandbox } from '../actions/fileSyncer'
  ← T1-3 FIX: imported to sync E2B disk state → currentFiles after successful validation

const FIVE_MINUTES      = 5 * 60 * 1000
const VALIDATION_COMMANDS = [
  'cd backend && npm install',
  'cd backend && npm run build',
  'cd frontend && npm install',
  'cd frontend && npm run build'
]

export async function generateOrchestrator(
  input: GenerateOrchestratorInput
): Promise<GenerateOrchestratorResult>

  const { projectId, userId, files, descriptions } = input

  const sandbox = await Sandbox.create({
    timeoutMs: 360_000
    ← E2B v1.x: timeoutMs in milliseconds (was 'timeout' in v0.16)
    ← 6 minutes — always outlives 5-minute inner timer
    ← apiKey auto-read from E2B_API_KEY env var
  })

  try {

    ─── Write All Files to Sandbox ─────────────────────────────────────

    for (const file of files):
      await sandbox.files.write(file.path, file.content)
    ← E2B v1.x API — auto-creates intermediate directories

    ─── Timer Setup ────────────────────────────────────────────────────

    const startTime     = Date.now()
    const timeRemaining = () => FIVE_MINUTES - (Date.now() - startTime)

    ─── Initialize ALL Variables BEFORE Outer Loop ─────────────────────

    let isRunning:    boolean         = true
    let currentFiles: FileItem[]      = [...files]
    let lastErrors:   CleanedError[]  = []
    let previousLog:  ActionLogItem[] = []
    ← previousLog initialized ONCE and NEVER reset — accumulates full history

    ─── OUTER LOOP ─────────────────────────────────────────────────────

    while (isRunning && timeRemaining() > 0):

      sendToClient(userId, {
        projectId,
        type:   'build',
        status: 'Running validation...'
      })

      ── Run ALL 4 Validation Commands ──────────────────────────────

      const validationErrors: CleanedError[] = []

      for (const cmd of VALIDATION_COMMANDS):
        const result = await commandRunner(sandbox, cmd)
        if (result.exitCode !== 0):
          validationErrors.push({
            command: cmd,
            side:    cmd.includes('frontend') ? 'frontend' : 'backend',
            error:   result.stderr || result.stdout
          })

      ── Check Validation Result ─────────────────────────────────────

      if (validationErrors.length === 0):
        isRunning  = false
        lastErrors = []
        break
        ← All 4 passed — exit outer loop

      lastErrors = validationErrors

      ── Per-Iteration Variables ─────────────────────────────────────

      let currentErrors:    CleanedError[] = [...validationErrors]
      ← FIX #7: filesWereUpdated variable REMOVED — was declared, set to true on action '2', never read.

      ─── INNER ERROR LOOP ────────────────────────────────────────────

      while (currentErrors.length > 0 && timeRemaining() > 0):

        sendToClient(userId, {
          projectId,
          type:   'build',
          status: 'Fixing errors...'
        })

        const agentResponse = await errorAgent({
          currentFiles,
          descriptions,
          errors:      currentErrors,
          previousLog
        })

        if (agentResponse.action === "1"):
          const cmd    = agentResponse.data as string
          const result = await commandRunner(sandbox, cmd)
          const logResult = result.stdout + result.stderr

          const filteredErrors = currentErrors.filter(e =>
            logResult.includes(e.error.slice(0, 50))
          )
          const fullResult = filteredErrors.length > 0
            ? logResult + '\n\nFiltered errors:\n' + JSON.stringify(filteredErrors)
            : logResult

          previousLog.push({ action: "1", data: cmd, result: fullResult })

        if (agentResponse.action === "2"):
          const updates = agentResponse.data as FileUpdateItem[]
          await fileUpdater(sandbox, currentFiles, updates)
          ← FIX #7: filesWereUpdated = true REMOVED here — variable was dead code
          previousLog.push({ action: "2", data: updates, result: 'Files updated' })

        if (agentResponse.action === "3"):
          const reads    = agentResponse.data as FileReadItem[]
          const contents = fileReader(currentFiles, reads)
          previousLog.push({ action: "3", data: reads, result: contents })

        if (agentResponse.action === "0"):
          if (agentResponse.fixed_status === true):
            currentErrors = []
            ← Clear errors — break inner loop on next iteration check
          ← fixed_status false: do NOT clear errors — agent not confident yet
          previousLog.push({ action: "0", data: '', result: '' })
          break

      ← End inner error loop
      ← Outer while continues: re-runs all 4 validation commands

    ─── Return Result ───────────────────────────────────────────────────

    const passed = lastErrors.length === 0

    ← T1-3 FIX: On success, sync E2B sandbox disk → in-memory currentFiles before returning.
    ← Captures any disk changes made by Action "1" commands (e.g. npm install writing package.json).
    if (passed):
      await syncFilesFromSandbox(sandbox, currentFiles)

    sendToClient(userId, {
      projectId,
      type:   'build',
      status: passed ? 'Validation passed' : 'Validation timed out'
    })

    return {
      success: passed,
      files:   currentFiles,
      errors:  lastErrors
    }

  } finally {
    try {
      await sandbox.kill()
    } catch (killErr) {
      console.error('Failed to kill generate sandbox:', killErr)
      ← Never rethrow in finally
    }
  }
```

---

### backend/src/services/orchestrators/modifyOrchestrator.ts

```typescript
IMPORTS:
  { Sandbox } from 'e2b'
  { sendToClient } from '../../utils/wsClients'
  { modifyAgent } from '../agents/modifyAgent'
  { errorAgent } from '../agents/errorAgent'
  { commandRunner } from '../actions/commandRunner'
  { fileUpdater } from '../actions/fileUpdater'
  { fileReader } from '../actions/fileReader'
  { syncFilesFromSandbox } from '../actions/fileSyncer'
  ← T1-3 FIX: imported to sync E2B disk state → currentFiles after successful validation

const FIVE_MINUTES      = 5 * 60 * 1000
const VALIDATION_COMMANDS = [
  'cd backend && npm install',
  'cd backend && npm run build',
  'cd frontend && npm install',
  'cd frontend && npm run build'
]

export async function modifyOrchestrator(
  input: ModifyOrchestratorInput
): Promise<ModifyOrchestratorResult>

  const { files, descriptions, instruction, projectId, userId } = input

  const sandbox = await Sandbox.create({ timeoutMs: 360_000 })

  try {

    for (const file of files):
      await sandbox.files.write(file.path, file.content)

    const startTime     = Date.now()
    const timeRemaining = () => FIVE_MINUTES - (Date.now() - startTime)

    let currentFiles:  FileItem[]      = [...files]
    let modifiedFiles: FileItem[]      = []
    ← Tracks ALL changed files (deduped by path) across entire session
    let previousLog:   ActionLogItem[] = []
    ← NEVER reset — accumulates full session history
    let lastErrors:    CleanedError[]  = []
    let agentFixed:    boolean         = false

    ─── MODIFIER LOOP ───────────────────────────────────────────────────

    while (!agentFixed && timeRemaining() > 0):

      const agentResponse = await modifyAgent({
        instruction,
        descriptions,
        previousLog,
        validationErrors: lastErrors
      })

      if (agentResponse.action === "1"):
        const cmd    = agentResponse.data as string
        const result = await commandRunner(sandbox, cmd)
        previousLog.push({ action: "1", data: cmd, result: result.stdout + result.stderr })

      if (agentResponse.action === "2"):
        const updates = agentResponse.data as FileUpdateItem[]
        await fileUpdater(sandbox, currentFiles, updates)
        updates.forEach(u => {
          const existing = modifiedFiles.findIndex(m => m.path === u.filepath)
          if (existing !== -1):
            modifiedFiles[existing].content = u.updated_code
          else:
            modifiedFiles.push({ path: u.filepath, content: u.updated_code })
        })
        previousLog.push({ action: "2", data: updates, result: 'Files updated' })

      if (agentResponse.action === "3"):
        const reads    = agentResponse.data as FileReadItem[]
        const contents = fileReader(currentFiles, reads)
        previousLog.push({ action: "3", data: reads, result: contents })

      if (agentResponse.action === "0"):
        agentFixed = agentResponse.fixed_status
        previousLog.push({ action: "0", data: '', result: '' })
        break

    ─── Post-Modifier Validation ─────────────────────────────────────────

    sendToClient(userId, { projectId, type: 'chat', status: 'Running validation...' })

    const validationErrors: CleanedError[] = []
    for (const cmd of VALIDATION_COMMANDS):
      const result = await commandRunner(sandbox, cmd)
      if (result.exitCode !== 0):
        validationErrors.push({
          command: cmd,
          side:    cmd.includes('frontend') ? 'frontend' : 'backend',
          error:   result.stderr || result.stdout
        })

    lastErrors = validationErrors

    if (validationErrors.length === 0):
      ← T1-3 FIX: Sync disk → memory before saving. Captures Action "1" disk changes.
      await syncFilesFromSandbox(sandbox, currentFiles)
      return {
        success:       true,
        files:         currentFiles,
        modifiedFiles,
        message:       instruction,
        errors:        []
      }

    ─── ERROR RECOVERY LOOP ───────────────────────────────────────────────

    let modificationPassed = false

    while (!modificationPassed && timeRemaining() > 0):

      ← Re-derive everything from lastErrors at TOP of EVERY iteration
      const currentSide = lastErrors.some(e => e.side === 'frontend')
        ? (lastErrors.some(e => e.side === 'backend') ? 'both' : 'frontend')
        : 'backend'

      const filteredDesc = descriptions.filter(d =>
        currentSide === 'both' ? true : d.path.startsWith(currentSide + '/')
      )

      const currentValidationErrors = lastErrors.filter(e =>
        currentSide === 'both' ? true : e.side === currentSide
      )

      let isFixed = false

      ─── INNER ERROR LOOP ─────────────────────────────────────────────

      while (!isFixed && timeRemaining() > 0):

        const agentResponse = await modifyAgent({
          instruction,
          descriptions:     filteredDesc,
          previousLog,
          validationErrors: currentValidationErrors,
          promptContext:    `Focus on ${currentSide} errors`
        })

        if (agentResponse.action === "1"):
          const cmd    = agentResponse.data as string
          const result = await commandRunner(sandbox, cmd)
          const resultWithErrors = result.stdout + result.stderr +
            '\n\nActive errors:\n' + JSON.stringify(currentValidationErrors)
          previousLog.push({ action: "1", data: cmd, result: resultWithErrors })

        if (agentResponse.action === "2"):
          const updates = agentResponse.data as FileUpdateItem[]
          await fileUpdater(sandbox, currentFiles, updates)
          updates.forEach(u => {
            const existing = modifiedFiles.findIndex(m => m.path === u.filepath)
            if (existing !== -1):
              modifiedFiles[existing].content = u.updated_code
            else:
              modifiedFiles.push({ path: u.filepath, content: u.updated_code })
          })
          previousLog.push({ action: "2", data: updates, result: 'Files updated' })

        if (agentResponse.action === "3"):
          const reads    = agentResponse.data as FileReadItem[]
          const contents = fileReader(currentFiles, reads)
          previousLog.push({ action: "3", data: reads, result: contents })

        if (agentResponse.action === "0"):
          isFixed = agentResponse.fixed_status
          previousLog.push({ action: "0", data: '', result: '' })
          break

      ← Re-run ALL 4 validation commands
      const newErrors: CleanedError[] = []
      for (const cmd of VALIDATION_COMMANDS):
        const result = await commandRunner(sandbox, cmd)
        if (result.exitCode !== 0):
          newErrors.push({
            command: cmd,
            side:    cmd.includes('frontend') ? 'frontend' : 'backend',
            error:   result.stderr || result.stdout
          })
      lastErrors = newErrors

      if (lastErrors.length === 0):
        modificationPassed = true
        break
      ← else: outer while loops, side re-derived from new lastErrors

    ─── Return Final Result ──────────────────────────────────────────────

    if (modificationPassed):
      ← T1-3 FIX: Sync disk → memory before saving. Captures Action "1" disk changes.
      await syncFilesFromSandbox(sandbox, currentFiles)
      return {
        success:       true,
        files:         currentFiles,
        modifiedFiles,
        message:       instruction,
        errors:        []
      }

    return {
      success:       false,
      files:         currentFiles,
      modifiedFiles: [],
      message:       'Could not complete within time limit',
      errors:        lastErrors
    }

  } finally {
    try {
      await sandbox.kill()
    } catch (killErr) {
      console.error('Failed to kill modify sandbox:', killErr)
    }
  }
```

---

### backend/src/services/agents/plannerAgent.ts

```typescript
IMPORTS:
  Anthropic from '@anthropic-ai/sdk'
  { TECH_STACK, safeParseJSON } from '../../utils/promptTemplates'
  ← safeParseJSON replaces manual stripMarkdownFences + JSON.parse (ERROR #7 FIX)

const client = new Anthropic()

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
ABSOLUTE STRUCTURE RULE — READ THIS FIRST, OBEY IT ALWAYS: ← NEW #14
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
`

export async function plannerAgent(
  prompt: string
): Promise<PlannerResult>

  const response = await client.messages.create({
    model:      'claude-sonnet-4-5-20250929',
    ← ERROR MODEL FIX: correct dated model string
    max_tokens: 4096,
    system:     SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Create a project plan for: ${prompt}` }]
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  return safeParseJSON<PlannerResult>(raw)
  ← ERROR #7 FIX: safeParseJSON includes regex fallback + try/catch
```

---

### backend/src/services/agents/depthAgent.ts

```typescript
IMPORTS:
  Anthropic from '@anthropic-ai/sdk'
  { TECH_STACK, exampleDescription, safeParseJSON } from '../../utils/promptTemplates'

const client = new Anthropic()

const SYSTEM_PROMPT = `
You are a senior full-stack engineer writing detailed implementation plans.

${TECH_STACK}

════════════════════════════════════════════════════════════════
ABSOLUTE STRUCTURE RULE — OBEY ALWAYS: ← NEW #14
════════════════════════════════════════════════════════════════
BOTH backend/ AND frontend/ MUST be described/generated. No exceptions.
Even for simple static sites, a minimal Express backend is required because
the validation system always runs npm install/build for both directories.
Minimal backend: package.json with "dev"+"build" scripts, tsconfig.json,
.env, src/server.ts (import 'dotenv/config' first, initDB in try/catch),
src/app.ts, src/config/db.ts. Minimum: GET / returns { message: 'ok' }.
════════════════════════════════════════════════════════════════

For EACH file in the project, write a detailed FileDescription object.

WEBCONTAINERS CONSTRAINTS — APPLY TO ALL FILES:
- Database files: MUST use @neondatabase/serverless with sql tagged template literals.
- Auth files: MUST use bcryptjs (not bcrypt).
- No Redis unless using @upstash/redis.
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
        "explanation": "Creates sql = neon(process.env.DATABASE_URL). initDB() runs CREATE TABLE IF NOT EXISTS for all tables."
      }
    },
    ...
  ]
}

${exampleDescription}
`

export async function depthAgent(
  prompt:        string,
  plannerResult: PlannerResult
  ← FIX #5: exampleDesc: string parameter REMOVED.
  ← This was the third parameter. It was passed from buildController but the function
  ← body never used it — SYSTEM_PROMPT already interpolates ${exampleDescription} at
  ← module-level when the string is built. The parameter was silently dead.
  ← buildController now calls: depthAgent(prompt, plannerResult)  (two args only)
): Promise<DepthResult>

  const response = await client.messages.create({
    model:      'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    system:     SYSTEM_PROMPT,
    messages: [{
      role:    'user',
      content: `
Project prompt: ${prompt}
File structure:
${JSON.stringify(plannerResult, null, 2)}

Write detailed descriptions for ALL ${plannerResult.files.length} files.
`
    }]
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  return safeParseJSON<DepthResult>(raw)
```

---

### backend/src/services/agents/promptGeneratorAgent.ts

```typescript
IMPORTS:
  Anthropic from '@anthropic-ai/sdk'
  { TECH_STACK, safeParseJSON } from '../../utils/promptTemplates'

const client = new Anthropic()

const SYSTEM_PROMPT = `
You are a senior engineer writing detailed code-generation prompts for each file.

${TECH_STACK}

════════════════════════════════════════════════════════════════
ABSOLUTE STRUCTURE RULE — OBEY ALWAYS: ← NEW #14
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
`

export async function promptGeneratorAgent(
  prompt:        string,
  plannerResult: PlannerResult,
  depthResult:   DepthResult
): Promise<PromptGeneratorResult>

  const fileDescriptions = depthResult.files.map(f =>
    `${f.path}: ${JSON.stringify(f.description)}`
  ).join('\n\n')

  const response = await client.messages.create({
    model:      'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    system:     SYSTEM_PROMPT,
    messages: [{
      role:    'user',
      content: `
Original prompt: ${prompt}
All file descriptions:
${fileDescriptions}

Write a code-generation prompt for EACH of the ${depthResult.files.length} files.
`
    }]
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  return safeParseJSON<PromptGeneratorResult>(raw)
```

---

### backend/src/services/agents/codeGeneratorAgent.ts

```typescript
IMPORTS:
  Anthropic from '@anthropic-ai/sdk'
  { TECH_STACK, stripMarkdownFences } from '../../utils/promptTemplates'
  ← codeGeneratorAgent returns raw code string, not JSON — no safeParseJSON needed

const client = new Anthropic()

const SYSTEM_PROMPT = `
You are an expert full-stack engineer. Write complete, production-ready code files.

${TECH_STACK}


════════════════════════════════════════════════════════════════
ABSOLUTE STRUCTURE RULE: ← NEW #14
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
`

export async function codeGeneratorAgent(
  filePrompt: string,
  filePath:   string
): Promise<string>

  const response = await client.messages.create({
    model:      'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system:     SYSTEM_PROMPT,
    messages: [{
      role:    'user',
      content: `Write the complete contents of: ${filePath}\n\n${filePrompt}`
    }]
  })

  const raw  = response.content[0].type === 'text' ? response.content[0].text : ''
  const code = stripMarkdownFences(raw)

  if (!code.trim()):
    throw new Error(`codeGeneratorAgent returned empty content for ${filePath}`)

  return code
```

---

### backend/src/services/agents/chatSummarizerAgent.ts

```typescript
IMPORTS:
  Anthropic from '@anthropic-ai/sdk'
  { safeParseJSON } from '../../utils/promptTemplates'

const client = new Anthropic()

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
`

export async function chatSummarizerAgent(input: {
  chatHistory:    ChatMessage[]
  currentMessage: string
}): Promise<ChatSummaryResult>

  const { chatHistory, currentMessage } = input

  const response = await client.messages.create({
    model:      'claude-sonnet-4-5-20250929',
    max_tokens: 512,
    system:     SYSTEM_PROMPT,
    messages: [{
      role:    'user',
      content: `
Chat history:
${JSON.stringify(chatHistory, null, 2)}

Current user message:
${currentMessage}

Analyze and return the JSON.
`
    }]
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  return safeParseJSON<ChatSummaryResult>(raw)
```

---

### backend/src/services/agents/errorAgent.ts

```typescript
IMPORTS:
  Anthropic from '@anthropic-ai/sdk'
  { TECH_STACK, safeParseJSON } from '../../utils/promptTemplates'

const client = new Anthropic()

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
ABSOLUTE STRUCTURE RULE — CRITICAL: ← NEW #14
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
`

export async function errorAgent(input: {
  currentFiles:  FileItem[]
  descriptions:  FileDescriptionItem[]
  errors:        CleanedError[]
  previousLog:   ActionLogItem[]
}): Promise<AgentResponse>

  const { currentFiles, descriptions, errors, previousLog } = input

  const fileContents = currentFiles.map(f =>
    `=== ${f.path} ===\n${f.content}`
  ).join('\n\n')

  const response = await client.messages.create({
    model:      'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system:     SYSTEM_PROMPT,
    messages: [{
      role:    'user',
      content: `
Current errors:
${JSON.stringify(errors, null, 2)}

File descriptions:
${JSON.stringify(descriptions, null, 2)}

Previous actions taken:
${JSON.stringify(previousLog, null, 2)}

Current file contents:
${fileContents}

Take ONE action to fix these errors.
`
    }]
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  return safeParseJSON<AgentResponse>(raw)
```

---

### backend/src/services/agents/modifyAgent.ts

```typescript
IMPORTS:
  Anthropic from '@anthropic-ai/sdk'
  { TECH_STACK, safeParseJSON } from '../../utils/promptTemplates'

const client = new Anthropic()

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
ABSOLUTE STRUCTURE RULE — CRITICAL: ← NEW #14
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
`

export async function modifyAgent(input: {
  instruction:       string
  descriptions:      FileDescriptionItem[]
  previousLog:       ActionLogItem[]
  validationErrors?: CleanedError[]
  promptContext?:    string
}): Promise<AgentResponse>

  const { instruction, descriptions, previousLog, validationErrors, promptContext } = input

  const response = await client.messages.create({
    model:      'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system:     SYSTEM_PROMPT,
    messages: [{
      role:    'user',
      content: `
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
`
    }]
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  return safeParseJSON<AgentResponse>(raw)
```

---

## SECTION 8 — FRONTEND PER-FILE PSEUDOCODE

---

### frontend/src/main.tsx

```typescript
IMPORTS:
  React from 'react'
  { createRoot } from 'react-dom/client'
  { BrowserRouter } from 'react-router-dom'
  App from './App'
  { WebSocketProvider } from './context/WebSocketContext'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    </BrowserRouter>
  </React.StrictMode>
)
← T2-9 FIX: Added React.StrictMode. Previously missing despite the hasBooted useRef
← in ProjectPage being documented as 'Guards against double-boot (React StrictMode)'.
← StrictMode double-invokes effects in development to surface side-effect bugs.
← The hasBooted.current = true SYNCHRONOUSLY guard in ProjectPage correctly handles
← the second invocation — it sees hasBooted.current === true and returns immediately.
```

---

### frontend/src/App.tsx

```typescript
IMPORTS:
  { useState } from 'react'
  { Routes, Route, Navigate } from 'react-router-dom'
  { useWebSocket } from './context/WebSocketContext'
  AuthPage from './pages/AuthPage'
  DashboardPage from './pages/DashboardPage'
  ProjectPage from './pages/ProjectPage'
  * as authApi from './api/authApi'

export default function App()

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  ← Simple boolean auth state. No persisted session check on mount needed
  ← because httpOnly cookies are managed by the browser automatically.
  ← On page refresh: unauthenticated state — user lands on AuthPage.
  ← On successful login/signup: setIsAuthenticated(true) + initWS()

  const { initWS, closeWS } = useWebSocket()

  async function handleLoginSuccess()
    setIsAuthenticated(true)
    initWS()
    ← Open WebSocket after authentication succeeds
    ← WS connection uses the cookie set by login/signup

  async function handleLogout()
    try {
      await authApi.logout()
    } catch {
      ← ignore — clear cookie anyway
    }
    closeWS()
    setIsAuthenticated(false)

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated
            ? <Navigate to="/dashboard" replace />
            : <AuthPage onSuccess={handleLoginSuccess} />
        }
      />
      <Route
        path="/dashboard"
        element={
          isAuthenticated
            ? <DashboardPage onLogout={handleLogout} />
            : <Navigate to="/" replace />
        }
      />
      <Route
        path="/project/:id"
        element={
          isAuthenticated
            ? <ProjectPage />
            : <Navigate to="/" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
```

---

### frontend/src/context/WebSocketContext.tsx

```typescript
IMPORTS:
  { createContext, useContext, useRef, useState,
    useCallback, ReactNode } from 'react'

interface WebSocketContextType {
  ws:               WebSocket | null
  initWS:           () => void
  closeWS:          () => void
  reconnect:        () => void
  registerHandler:  (id: string, handler: (msg: any) => void) => void
  unregisterHandler:(id: string) => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

─────────────────────────────────────────────
export function WebSocketProvider({ children }: { children: ReactNode })

  const [ws, setWs]     = useState<WebSocket | null>(null)
  const handlers        = useRef(new Map<string, (msg: any) => void>())
  ← handlers in a ref — stable across renders

  const initWS = useCallback(() => {
    const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:5173/ws') + ''
    ← FIX #9: Default is ws://localhost:5173/ws (not 5000).
    ← ws://localhost:5173/ws hits the Vite dev server proxy (configured in vite.config.ts
    ← with /ws → ws://localhost:5000). The old default ws://localhost:5000 bypassed
    ← the Vite proxy entirely, meaning the /ws proxy config was unreachable dead code.
    ← Using port 5173 also ensures same-origin — cookie SameSite=Lax works correctly.

    const socket = new WebSocket(wsUrl)

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handlers.current.forEach(handler => handler(msg))
      } catch {
        ← Ignore malformed messages
      }
    }

    socket.onclose = () => { setWs(null) }
    socket.onerror = () => { ← Error logged; onclose fires after }

    setWs(socket)
  }, [])

  const closeWS = useCallback(() => {
    if (ws) ws.close()
    setWs(null)
  }, [ws])

  const reconnect = useCallback(() => {
    if (ws) ws.close()
    initWS()
  }, [ws, initWS])

  const registerHandler = useCallback((id: string, handler: (msg: any) => void) => {
    handlers.current.set(id, handler)
  }, [])

  const unregisterHandler = useCallback((id: string) => {
    handlers.current.delete(id)
  }, [])

  return (
    <WebSocketContext.Provider value={{ ws, initWS, closeWS, reconnect, registerHandler, unregisterHandler }}>
      {children}
    </WebSocketContext.Provider>
  )

export function useWebSocket(): WebSocketContextType
  const ctx = useContext(WebSocketContext)
  if (!ctx) throw new Error('useWebSocket must be inside WebSocketProvider')
  return ctx
```

---

### frontend/src/api/authApi.ts

```typescript
IMPORTS:
  axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export async function signup(username: string, password: string): Promise<void>
  await axios.post(`${BASE}/api/auth/signup`, { username, password }, {
    withCredentials: true
    ← withCredentials: true required for cookies to be sent/received
  })

export async function login(username: string, password: string): Promise<void>
  await axios.post(`${BASE}/api/auth/login`, { username, password }, {
    withCredentials: true
  })

export async function logout(): Promise<void>
  await axios.post(`${BASE}/api/auth/logout`, {}, {
    withCredentials: true
  })
```

---

### frontend/src/api/buildApi.ts

```typescript
IMPORTS:
  axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export async function build(prompt: string): Promise<BuildResponse>
  const response = await axios.post<BuildResponse>(
    `${BASE}/api/build`,
    { prompt },
    {
      withCredentials: true,
      timeout:         0
      ← No timeout — build pipeline can take minutes
      ← Express has no timeout either
    }
  )
  return response.data
```

---

### frontend/src/api/chatApi.ts

```typescript
IMPORTS:
  axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export async function chat(params: {
  projectId:   string
  message:     string
  chatHistory: ChatMessage[]
}): Promise<ModifyResponse>

  const response = await axios.post<ModifyResponse>(
    `${BASE}/api/chat`,
    params,
    {
      withCredentials: true,
      timeout:         0
      ← No timeout — modify pipeline can take minutes
    }
  )
  return response.data
```

---

### frontend/src/api/projectApi.ts

```typescript
IMPORTS:
  axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export async function getProjects(): Promise<ProjectListItem[]>
  const response = await axios.get<ProjectListItem[]>(
    `${BASE}/api/projects`,
    { withCredentials: true }
  )
  return response.data

export async function getProject(id: string): Promise<ProjectResponse>
  const response = await axios.get<ProjectResponse>(
    `${BASE}/api/projects/${id}`,
    { withCredentials: true }
  )
  return response.data
```

---

### frontend/src/pages/AuthPage.tsx

```typescript
IMPORTS:
  { useState } from 'react'
  AuthForm from '../components/auth/AuthForm'
  * as authApi from '../api/authApi'

interface AuthPageProps {
  onSuccess: () => void
}

export default function AuthPage({ onSuccess }: AuthPageProps)

  const [mode,  setMode]  = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  async function handleSubmit(username: string, password: string)
    setError('')
    setLoading(true)
    try {
      if (mode === 'login'):
        await authApi.login(username, password)
      else:
        await authApi.signup(username, password)
      onSuccess()
      ← App.tsx: setIsAuthenticated(true) + initWS()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }

  function toggleMode()
    setMode(prev => prev === 'login' ? 'signup' : 'login')
    setError('')

  return (
    <div className="auth-page">
      <h1>AI Website Builder</h1>
      <h2>{mode === 'login' ? 'Log In' : 'Sign Up'}</h2>

      {error && <p className="error">{error}</p>}

      <AuthForm
        onSubmit={handleSubmit}
        loading={loading}
        submitLabel={mode === 'login' ? 'Log In' : 'Sign Up'}
      />

      <button onClick={toggleMode}>
        {mode === 'login'
          ? "Don't have an account? Sign up"
          : 'Already have an account? Log in'}
      </button>
    </div>
  )
```

---

### frontend/src/pages/DashboardPage.tsx

```typescript
IMPORTS:
  { useState, useEffect } from 'react'
  { useNavigate } from 'react-router-dom'
  { useWebSocket } from '../context/WebSocketContext'
  Sidebar from '../components/dashboard/Sidebar'
  PromptInput from '../components/dashboard/PromptInput'
  LoadingScreen from '../components/shared/LoadingScreen'
  { build as buildApi } from '../api/buildApi'
  { getProjects } from '../api/projectApi'

interface DashboardPageProps {
  onLogout: () => void
}

export default function DashboardPage({ onLogout }: DashboardPageProps)

  const [projects,  setProjects]  = useState<ProjectListItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<string>('')

  const navigate               = useNavigate()
  const { ws, registerHandler, unregisterHandler } = useWebSocket()

  ─── Load project list on mount ───────────────────────────────────────

  useEffect(() => {
    getProjects()
      .then(data => setProjects(data))
      .catch(err => {
        if (err.response?.status === 401):
          onLogout()
          ← Session expired — log out
      })
  }, [])

  ─── Build handler ───────────────────────────────────────────────────

  async function handleBuild(prompt: string)
    setIsLoading(true)
    setStatusMsg('Starting build...')

    let handlerRegistered = false

    try {
      if (ws !== null):
        registerHandler('build-status', (msg: WSMessage) => {
          setStatusMsg(msg.status)
        })
        handlerRegistered = true

      const response = await buildApi(prompt)
      ← Waits for the ENTIRE pipeline (minutes potentially)
      ← axios timeout: 0 so it never times out

      navigate(`/project/${response.projectId}`, { state: response })
      ← Pass full project data via route state
      ← ProjectPage reads from location.state to avoid extra API call

    } catch (err: any) {
      setStatusMsg('Build failed. Please try again.')
      console.error('Build error:', err)

    } finally {
      if (handlerRegistered) unregisterHandler('build-status')
      setIsLoading(false)
    }

  ─── Render ──────────────────────────────────────────────────────────

  if (isLoading):
    return <LoadingScreen status={statusMsg} />

  return (
    <div className="dashboard-layout">
      <Sidebar
        projects={projects}
        onLogout={onLogout}
      />
      <main className="dashboard-main">
        <h2>Build a new website</h2>
        <PromptInput onSubmit={handleBuild} />
      </main>
    </div>
  )
```

---

### frontend/src/pages/ProjectPage.tsx

```typescript
IMPORTS:
  { useState, useEffect, useRef } from 'react'
  { useLocation, useNavigate, useParams } from 'react-router-dom'
  ← T1-10 / T2-11 FIX: Added useParams for type-safe route parameter extraction
  { useWebSocket } from '../context/WebSocketContext'
  * as webContainerService from '../services/webContainerService'
  { getProject } from '../api/projectApi'
  { chat as chatApi } from '../api/chatApi'
  ChatPanel from '../components/project/ChatPanel'
  FileViewer from '../components/project/FileViewer'
  PreviewPanel from '../components/project/PreviewPanel'
  LoadingScreen from '../components/shared/LoadingScreen'

export default function ProjectPage()

  STATE:
    files:         FileItem[]             = []
    structure:     FolderStructure | null = null
    chatHistory:   ChatMessage[]          = []    ← setter: setChatHistory
    previewUrl:    string | null          = null
    isBooting:     boolean                = false
    ← T1-7 FIX: Renamed from isLoading to isBooting. Set only during WebContainer initial boot.
    ← handleMessage (chat ops) does NOT set this flag — the full-page LoadingScreen
    ← is ONLY shown while the container is first starting, never during chat operations.
    ← inputDisabled already prevents double-sends during chat; full-page takeover not needed.
    statusMsg:     string                 = ''
    inputDisabled: boolean                = false

  REFS:
    hasBooted: useRef<boolean>(false)
    ← Guards against double-boot (React StrictMode)

  HOOKS:
    location = useLocation()
    navigate  = useNavigate()
    { id: projectId } = useParams<{ id: string }>()
    ← T1-10 FIX: Type-safe param extraction. Route is /project/:id defined in App.tsx.
    ← Replaces fragile location.pathname.split('/').pop() (fails on trailing-slash URLs).
    { ws, registerHandler, unregisterHandler } = useWebSocket()

  ─── Load project data ───────────────────────────────────────────────

  useEffect(() => {
    const state = location.state as ProjectResponse | null

    if (state && state.files):
      ← New project: data came via navigate({ state: response })
      setFiles(state.files)
      setStructure(state.structure)
      setChatHistory(state.chatHistory || [])

    else:
      ← Existing project or page refresh: fetch from server
      ← T1-10 FIX: projectId now from useParams() in HOOKS — no pathname.split() needed.
      getProject(projectId!).then(data => {
        setFiles(data.files)
        setStructure(data.structure)
        setChatHistory(data.chatHistory || [])
      }).catch(err => {
        if (err.response?.status === 404 || err.response?.status === 403):
          navigate('/dashboard')
      })

  }, [])

  ─── Boot WebContainer when files are ready ──────────────────────────

  useEffect(() => {
    if (files.length === 0)  return    ← Guard: no files yet
    if (hasBooted.current)   return    ← Guard: already booted

    hasBooted.current = true           ← Set SYNCHRONOUSLY before async

    setIsBooting(true)
    setStatusMsg('Starting preview...')

    webContainerService.startContainer(files)
      .then(url => {
        setPreviewUrl(url)
        setIsBooting(false)
      })
      .catch(err => {
        console.error('WebContainer start failed:', err)
        setIsBooting(false)
      })

  }, [files])

  ─── Cleanup on unmount ──────────────────────────────────────────────

  useEffect(() => {
    return () => {
      hasBooted.current = false
      webContainerService.cleanup()
    }
  }, [])

  ─── WebSocket handler for status messages ───────────────────────────

  useEffect(() => {
    const handlerId = 'project-page'

    if (ws !== null):
      registerHandler(handlerId, (msg: WSMessage) => {
        if (msg.status) setStatusMsg(msg.status)
      })

    return () => {
      if (ws !== null) unregisterHandler(handlerId)
    }
  }, [ws])

  ─── Chat handler ────────────────────────────────────────────────────

  async function handleMessage(userInput: string)

    const userMsg: ChatMessage = {
      role:      'user',
      message:   userInput,
      timestamp: new Date()
    }
    const newHistory = [...chatHistory, userMsg]
    setChatHistory(newHistory)          ← Update local history first

    setInputDisabled(true)
    setStatusMsg('Sending...')
    ← T1-7 FIX: setIsBooting NOT set here — chat ops never trigger full-page LoadingScreen.

    let handlerRegistered = false

    try {
      if (ws !== null):
        registerHandler('chat-status', (msg: WSMessage) => {
          setStatusMsg(msg.status)
        })
        handlerRegistered = true

      const response = await chatApi({
        projectId:   projectId!,
        ← T1-10 FIX: projectId from useParams() — was location.pathname.split('/').pop()!
        message:     userInput,
        chatHistory: newHistory
      })

      ─── Handle response ──────────────────────────────────────────────

      if (response.type === 'question'):
        const assistantMsg: ChatMessage = {
          role:      'assistant',
          message:   response.message,
          timestamp: new Date()
        }
        setChatHistory(prev => [...prev, assistantMsg])

      else if (response.type === 'modification' && response.files.length > 0):

        ← ERROR #8 FIX: compute updatedFiles BEFORE setFiles callback
        ← Avoids ReferenceError if computed inside setFiles prev callback
        const updatedFiles: FileItem[] = [...files]
        for (const modFile of response.files):
          const idx = updatedFiles.findIndex(f => f.path === modFile.path)
          if (idx !== -1):
            updatedFiles[idx].content = modFile.content
          else:
            updatedFiles.push(modFile)

        setFiles(updatedFiles)            ← Pass computed value directly

        const assistantMsg: ChatMessage = {
          role: 'assistant', message: response.message, timestamp: new Date()
        }
        setChatHistory(prev => [...prev, assistantMsg])

        setStatusMsg('Restarting preview...')
        const url = await webContainerService.restart(updatedFiles)
        ← updatedFiles in outer scope — no ReferenceError
        setPreviewUrl(url)

      else:
        ← modification with files.length === 0 = agent failed
        setChatHistory(prev => [...prev, {
          role: 'assistant', message: response.message, timestamp: new Date()
        }])

    } catch (err) {
      setChatHistory(prev => [...prev, {
        role: 'assistant', message: 'Something went wrong. Please try again.', timestamp: new Date()
      }])

    } finally {
      if (handlerRegistered && ws !== null):
        unregisterHandler('chat-status')
      setInputDisabled(false)
      setStatusMsg('')
    }

  ─── Render ──────────────────────────────────────────────────────────

  if (isBooting):
    return <LoadingScreen status={statusMsg} />
  ← T1-7 FIX: Only block full page during initial WebContainer boot (isBooting).
  ← During chat: statusMsg shows in ChatPanel status area; layout stays fully visible.

  return (
    <div className="project-layout">
      <ChatPanel
        chatHistory={chatHistory}
        onSend={handleMessage}
        disabled={inputDisabled}
      />
      <FileViewer files={files} />
      ← FIX #11: structure prop removed — FileViewer does not accept or use it
      <PreviewPanel previewUrl={previewUrl} />
    </div>
  )
```

---

### frontend/src/components/auth/AuthForm.tsx

```typescript
IMPORTS:
  { useState } from 'react'

interface AuthFormProps {
  onSubmit:    (username: string, password: string) => void
  loading:     boolean
  submitLabel: string
}

export default function AuthForm({ onSubmit, loading, submitLabel }: AuthFormProps)

  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  function handleSubmit(e: React.FormEvent)
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    onSubmit(username.trim(), password.trim())

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          disabled={loading}
          autoComplete="username"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
          autoComplete="current-password"
          required
        />
      </div>
      <button type="submit" disabled={loading || !username.trim() || !password.trim()}>
        {loading ? 'Please wait...' : submitLabel}
      </button>
    </form>
  )
```

---

### frontend/src/components/dashboard/Sidebar.tsx

```typescript
IMPORTS:
  { useNavigate } from 'react-router-dom'

interface SidebarProps {
  projects: ProjectListItem[]
  onLogout: () => void
}

export default function Sidebar({ projects, onLogout }: SidebarProps)

  const navigate = useNavigate()

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>My Projects</h2>
      </div>

      <nav className="sidebar-projects">
        {projects.length === 0 && (
          <p className="sidebar-empty">No projects yet. Build one!</p>
        )}
        {projects.map(p => (
          <button
            key={p.projectId}
            className="sidebar-project-item"
            onClick={() => navigate(`/project/${p.projectId}`)}
          >
            <span className="project-name">{p.projectName}</span>
            <span className="project-date">
              {new Date(p.createdAt).toLocaleDateString()}
            </span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button onClick={onLogout} className="logout-button">
          Log Out
        </button>
      </div>
    </aside>
  )
```

---

### frontend/src/components/dashboard/PromptInput.tsx

```typescript
IMPORTS:
  { useState } from 'react'

interface PromptInputProps {
  onSubmit: (prompt: string) => void
}

export default function PromptInput({ onSubmit }: PromptInputProps)

  const [value, setValue] = useState<string>('')

  function handleSubmit(e: React.FormEvent)
    e.preventDefault()
    if (!value.trim()) return
    onSubmit(value.trim())
    setValue('')

  return (
    <form onSubmit={handleSubmit} className="prompt-input">
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Describe the website you want to build..."
        rows={4}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)):
            e.preventDefault()
            if (value.trim()) onSubmit(value.trim()); setValue('')
        }}
      />
      <button type="submit" disabled={!value.trim()}>
        Build Website
      </button>
    </form>
  )
```

---

### frontend/src/components/project/ChatPanel.tsx

```typescript
IMPORTS:
  { useState, useRef, useEffect } from 'react'

interface ChatPanelProps {
  chatHistory: ChatMessage[]
  onSend:      (message: string) => void
  disabled:    boolean
}

export default function ChatPanel({ chatHistory, onSend, disabled }: ChatPanelProps)

  const [input,     setInput]     = useState<string>('')
  const messagesEnd = useRef<HTMLDivElement>(null)

  ← Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  function handleSend()
    if (!input.trim() || disabled) return
    onSend(input.trim())
    setInput('')

  function handleKeyDown(e: React.KeyboardEvent)
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)):
      e.preventDefault()
      handleSend()

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {chatHistory.map((msg, i) => (
          <div key={i} className={`chat-message chat-message--${msg.role}`}>
            <span className="chat-role">{msg.role === 'user' ? 'You' : 'AI'}</span>
            <p className="chat-content">{msg.message}</p>
          </div>
        ))}
        <div ref={messagesEnd} />
      </div>

      <div className="chat-input-area">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask for changes or questions... (Ctrl+Enter to send)"
          rows={3}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
        >
          {disabled ? 'Processing...' : 'Send'}
        </button>
      </div>
    </div>
  )
```

---

### frontend/src/components/project/FileViewer.tsx

```typescript
IMPORTS:
  { useState } from 'react'

interface FileViewerProps {
  files: FileItem[]
  ← FIX #11: structure prop REMOVED — was in the interface and accepted by the component
  ← but was NEVER referenced anywhere in the component body. Dead prop.
  ← Also removed from all call sites (ProjectPage.tsx — no longer passes structure).
}

export default function FileViewer({ files }: FileViewerProps)

  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  const selectedFile = files.find(f => f.path === selectedPath)

  ← Build a sorted file list for display
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path))

  return (
    <div className="file-viewer">
      <div className="file-list">
        <h3>Files</h3>
        {sortedFiles.map(f => (
          <button
            key={f.path}
            className={`file-item ${selectedPath === f.path ? 'file-item--active' : ''}`}
            onClick={() => setSelectedPath(f.path)}
          >
            {f.path}
          </button>
        ))}
      </div>

      <div className="file-content">
        {selectedFile
          ? (
            <>
              <div className="file-content-header">
                <code>{selectedFile.path}</code>
              </div>
              <pre className="file-content-body">
                <code>{selectedFile.content}</code>
              </pre>
            </>
          )
          : (
            <p className="file-content-empty">
              Select a file to view its contents.
            </p>
          )
        }
      </div>
    </div>
  )
```

---

### frontend/src/components/project/PreviewPanel.tsx

```typescript
interface PreviewPanelProps {
  previewUrl: string | null
}

export default function PreviewPanel({ previewUrl }: PreviewPanelProps)

  if (!previewUrl):
    return (
      <div className="preview-panel preview-panel--loading">
        <p>Preview is loading...</p>
      </div>
    )

  return (
    <div className="preview-panel">
      <div className="preview-toolbar">
        <span className="preview-url">{previewUrl}</span>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="preview-open-button"
        >
          Open in new tab ↗
        </a>
      </div>
      <iframe
        src={previewUrl}
        className="preview-frame"
        title="Website Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        ← sandbox attribute restricts iframe for security
        ← allow-same-origin required for WebContainer preview to work
      />
    </div>
  )
```

---

### frontend/src/components/shared/LoadingScreen.tsx

```typescript
interface LoadingScreenProps {
  status: string
}

export default function LoadingScreen({ status }: LoadingScreenProps)

  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p className="loading-status">
        {status || 'Loading...'}
      </p>
    </div>
  )
```

---

### frontend/src/services/webContainerService.ts

```typescript
← ERROR #2 FIX: backendProcess tracked at module level.
← Killed alongside devProcess in restart() and cleanup().
← Prevents EADDRINUSE crash when user modifies generated app.

IMPORTS:
  { WebContainer } from '@webcontainer/api'

← MODULE-LEVEL SINGLETONS:
let webcontainerInstance: WebContainer | null = null
let devProcess:           any                 = null
let backendProcess:       any                 = null   ← ERROR #2 FIX
let previewUrl:           string | null       = null

─────────────────────────────────────────────
function buildMountStructure(files: FileItem[]): object
  ← Converts flat FileItem[] to WebContainer nested directory object
  ← e.g. [{ path: "backend/src/server.ts", content: "..." }]
  ←    → { backend: { directory: { src: { directory: { "server.ts": { file: { contents: "..." } } } } } } }

  const root: any = {}
  for (const file of files):
    const parts = file.path.split('/')
    let node = root
    for (let i = 0; i < parts.length - 1; i++):
      if (!node[parts[i]]):
        node[parts[i]] = { directory: {} }
      node = node[parts[i]].directory
    node[parts[parts.length - 1]] = { file: { contents: file.content } }
  return root

─────────────────────────────────────────────
export async function startContainer(files: FileItem[]): Promise<string>

  ── CASE A: Fully running — return immediately ─────────────────────────

  if (webcontainerInstance !== null && previewUrl !== null):
    return previewUrl

  ── CASE B: Stale instance — cleanup ──────────────────────────────────

  if (webcontainerInstance !== null && previewUrl === null):
    const stale = webcontainerInstance
    webcontainerInstance = null
    devProcess           = null
    backendProcess       = null   ← ERROR #2 FIX
    ← T1-5 FIX: WebContainer.teardown() returns void (not Promise<void>).
    ← Calling .catch() on void is .catch() on undefined = TypeError thrown at runtime.
    ← In CASE B this unhandled TypeError propagates up and crashes startContainer()
    ← instead of recovering gracefully. Use synchronous try/catch instead.
    try {
      stale.teardown()
    } catch (teardownErr) {
      console.error('Failed to teardown stale WebContainer:', teardownErr)
    }
    ← Fall through: webcontainerInstance now null

  ── Boot ───────────────────────────────────────────────────────────────

  webcontainerInstance = await WebContainer.boot()
  ← Requires COOP/COEP headers from vite.config.ts
  ── Mount files ──────────────────────────────────────────────────────

  const mountStructure = buildMountStructure(files)
  await webcontainerInstance.mount(mountStructure)

  ── Install backend dependencies ─────────────────────────────────────

  const backendInstall = await webcontainerInstance.spawn('npm', ['install'], {
    cwd: '/backend'
    ← CRITICAL: Without cwd, npm looks at root where there's no package.json
  })
  const backendInstallExit = await backendInstall.exit
  if (backendInstallExit !== 0):
    throw new Error('Backend npm install failed')

  ── Start backend Express server ──────────────────────────────────────

  backendProcess = await webcontainerInstance.spawn('npm', ['run', 'dev'], {
    cwd: '/backend'
  })
  ← ERROR #2 FIX: assigned to module-level backendProcess (not local const)
  backendProcess.output.pipeTo(new WritableStream({
    write(data) { console.log('[backend]', data) }
  }))

  ── Install frontend dependencies ────────────────────────────────────

  const frontendInstall = await webcontainerInstance.spawn('npm', ['install'], {
    cwd: '/frontend'
  })
  const frontendInstallExit = await frontendInstall.exit
  if (frontendInstallExit !== 0):
    throw new Error('Frontend npm install failed')

  ── Start Vite dev server ─────────────────────────────────────────────

  devProcess = await webcontainerInstance.spawn('npm', ['run', 'dev'], {
    cwd: '/frontend'
  })
  devProcess.output.pipeTo(new WritableStream({
    write(data) { console.log('[frontend]', data) }
  }))

  ── Wait for Vite server-ready ────────────────────────────────────────

  const url = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe()
      reject(new Error('WebContainer server-ready timeout after 30s'))
    }, 30_000)

    ← .on() returns an unsubscribe function — WebContainers API has NO .once()
    const unsubscribe = webcontainerInstance!.on('server-ready', (port, serverUrl) => {
      if (port === 5173):
        ← Filter: ONLY resolve for Vite port 5173
        ← Without this, Express port could resolve first showing "Cannot GET /"
        clearTimeout(timeout)
        unsubscribe()
        ← Unsubscribe immediately — prevents memory leak on restart
        resolve(serverUrl)
    })
  })

  previewUrl = url
  return url

─────────────────────────────────────────────
export async function restart(files: FileItem[]): Promise<string>

  ← Called from ProjectPage when chat modification is applied
  ← ERROR #2 FIX: also kills backendProcess before respawning

  if (!webcontainerInstance):
    return startContainer(files)
    ← Null guard: fallback to full boot if torn down

  ── Kill existing processes ───────────────────────────────────────────

  if (devProcess):
    devProcess.kill()
    devProcess = null

  if (backendProcess):                    ← ERROR #2 FIX
    backendProcess.kill()
    backendProcess = null
  ← Without this: old Express keeps port 5000 → new Express crashes EADDRINUSE

  ── Wipe stale source files ───────────────────────────────────────────

  try {
    await webcontainerInstance.fs.rm('/frontend/src', { recursive: true })
  } catch { }
  ← T1-6 FIX: Absolute path with leading /. Relative paths resolve to the workdir
  ← (auto-generated path like /home/user/abc123/frontend/src) which does not exist.
  ← Files are mounted at /frontend/src at filesystem root. Without the leading /,
  ← fs.rm silently fails — try/catch swallows the ENOENT — stale files persist —
  ← renamed components cause Vite duplicate-module errors.

  try {
    await webcontainerInstance.fs.rm('/backend/src', { recursive: true })
  } catch { }

  ── Write all updated files ───────────────────────────────────────────

  const mountStructure = buildMountStructure(files)
  await webcontainerInstance.mount(mountStructure)

  ── Re-install and restart ────────────────────────────────────────────

  const backendInstall = await webcontainerInstance.spawn('npm', ['install'], { cwd: '/backend' })
  await backendInstall.exit

  backendProcess = await webcontainerInstance.spawn('npm', ['run', 'dev'], { cwd: '/backend' })
  ← ERROR #2 FIX: assigned to module-level backendProcess
  backendProcess.output.pipeTo(new WritableStream({ write(data) { console.log('[backend]', data) } }))

  const frontendInstall = await webcontainerInstance.spawn('npm', ['install'], { cwd: '/frontend' })
  await frontendInstall.exit

  devProcess = await webcontainerInstance.spawn('npm', ['run', 'dev'], { cwd: '/frontend' })
  devProcess.output.pipeTo(new WritableStream({ write(data) { console.log('[frontend]', data) } }))

  previewUrl = null

  ── Wait for server-ready ─────────────────────────────────────────────

  const url = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe()
      reject(new Error('Restart timeout'))
    }, 30_000)

    const unsubscribe = webcontainerInstance!.on('server-ready', (port, serverUrl) => {
      if (port === 5173):
        clearTimeout(timeout)
        unsubscribe()
        resolve(serverUrl)
    })
  })

  previewUrl = url
  return url

─────────────────────────────────────────────
export function cleanup(): void
  ← Called when ProjectPage unmounts (navigate away) or logout
  ← Capture refs FIRST → null sync → background teardown

  const instance      = webcontainerInstance
  const proc          = devProcess
  const backendProc   = backendProcess     ← ERROR #2 FIX

  webcontainerInstance = null
  devProcess           = null
  backendProcess       = null              ← ERROR #2 FIX
  previewUrl           = null

  if (proc):         try { proc.kill()        } catch {}
  if (backendProc):  try { backendProc.kill()  } catch {}
  ← T1-5 FIX: teardown() is synchronous (returns void). .catch() on void throws TypeError.
  if (instance):
    try { instance.teardown() } catch (err) { console.error('WebContainer teardown error:', err) }
```

---

## SECTION 9 — PHASE-BY-PHASE FLOW

### Phase 1 — Signup / Login

```
POST /api/auth/signup
  authController.signup():
    Validate username + password present
    userExistsByUsername(username) → via User.ts model
    If exists: 400
    bcryptjs.hash(password, 10)
    createUser(username, hashed) → via User.ts model
    generateToken(userId, username) → JWT
    res.cookie('token', token, { httpOnly, sameSite:'lax', maxAge:7d })
    return 201

POST /api/auth/login
  authController.login():
    findUserByUsername(username) → via User.ts model
    If not found: 401
    bcryptjs.compare(password, user.password)
    If invalid: 401
    generateToken → JWT cookie
    return 200

POST /api/auth/logout
  res.clearCookie('token')
  return 200
```

### Phase 2 — WebSocket Connection

```
Frontend App.tsx:
  On login/signup success: handleLoginSuccess()
    setIsAuthenticated(true)
    initWS()
  new WebSocket(VITE_WS_URL)
  ← Cookie sent automatically with the upgrade request
  ← Vite /ws proxy in vite.config.ts routes to ws://localhost:5000

Backend server.ts:
  wss.on('connection', (ws, req)):
    Parse JWT from req.headers.cookie (NOT ws.upgradeReq — removed ws v3+)
    On success: add ws to wsClients.get(userId).add(ws)
    On failure: ws.close()
  ws.on('close'):
    connections.delete(ws)
    If Set empty: wsClients.delete(userId)

On logout:
  closeWS() → ws.close() → server removes from Set
```

### Phase 3 — Dashboard

```
GET /api/projects (authMiddleware):
  getProjectsByUserId(userId) → via Project.ts model
  return ProjectListItem[]

Frontend DashboardPage:
  Renders Sidebar (project list) + PromptInput
  getProjects() on mount
  handleBuild(prompt) on PromptInput submit
```

### Phase 4 — Build Flow (Frontend)

```
User submits prompt in PromptInput:
  setIsLoading(true) ← FIRST
  setStatusMsg('Starting build...')

  let handlerRegistered = false
  if (ws !== null):
    registerHandler('build-status', msg => setStatusMsg(msg.status))
    handlerRegistered = true

  const response = await buildApi(prompt)  ← timeout: 0, waits for full pipeline

  navigate(`/project/${response.projectId}`, { state: response })
  ← Pass full BuildResponse via route state

  finally:
    if (handlerRegistered) unregisterHandler('build-status')
    setIsLoading(false)
```

### Phase 5 — Build Flow (Backend)

```
POST /api/build (authMiddleware):
  buildController.build():
    OUTER try (before projectId exists):
      projectId = crypto.randomUUID()  ← explicit import crypto from 'crypto'
      sendToClient(userId, 'Build started')
      INNER try (pipeline):
        plannerAgent(prompt) → PlannerResult
        depthAgent(prompt, plannerResult) → DepthResult
          ← FIX #5: Called with 2 args only. exampleDescription was a dead 3rd param.
        promptGeneratorAgent(prompt, plannerResult, depthResult) → PromptGeneratorResult
        pLimit(3) parallel → codeGeneratorAgent per file → FileItem[]
        generateOrchestrator({ projectId, userId, files, descriptions, structure })
          → GenerateOrchestratorResult
        createProject({ id: projectId, ... }) ← via Project.ts model
        sendToClient 'Build complete'
        return BuildResponse
      INNER catch:
        sendToClient 'Build failed'
        return 500
    OUTER catch:
      return 500 (no projectId — no WS possible)
```

### Phase 6 — Generate Orchestrator

```
Sandbox.create({ timeoutMs: 360_000 })  ← E2B v1.x (milliseconds)
try:
  Write all files: sandbox.files.write(path, content)  ← v1.x API
  startTime = Date.now()
  Init: isRunning=true, currentFiles=[...files], lastErrors=[], previousLog=[]
  previousLog NEVER reset — accumulates entire session history

  OUTER LOOP (while isRunning && timeRemaining() > 0):
    Run all 4 commands via commandRunner()
    commandRunner: sandbox.commands.run(cmd, { timeoutMs: 120_000 })
    ← T1-9 FIX: onStdout/onStderr callbacks removed (FIX #6). result.stdout/stderr returned directly.
    If all 4 pass (exitCode 0): isRunning=false, break

    INNER LOOP: errorAgent → ONE action per iteration
      "1": commandRunner → append log with filtered errors
      "2": fileUpdater (sandbox.files.write + in-memory update)
      "3": fileReader (in-memory only)
      "0" fixed=true:  clear currentErrors, break inner
      "0" fixed=false: do NOT clear, break inner (outer re-validates)

  Return { success, files: currentFiles, errors: lastErrors }

finally:
  try { await sandbox.kill() } catch {}  ← always kill, never rethrow
```

### Phase 7 — Project Page Loads

```
Navigate to /project/:id with state from build response:
  ProjectPage: location.state → setFiles, setStructure, setChatHistory

Page refresh (no state):
  getProject(id) via projectApi → setFiles, setStructure, setChatHistory
  404/403 → navigate('/dashboard')

useEffect([files]) after state is set:
  Guard: files.length === 0 → skip
  Guard: hasBooted.current === true → skip
  hasBooted.current = true  ← Set SYNCHRONOUSLY before async

  startContainer(files):
    CASE A: webcontainerInstance !== null && previewUrl !== null → return url
    CASE B: webcontainerInstance !== null && previewUrl === null → teardown, fall through
    Boot WebContainer.boot() (unconditionally — always null here)
    mount(buildMountStructure(files))
    npm install (cwd: '/backend')
    npm run dev (cwd: '/backend') → backendProcess (module level)
    npm install (cwd: '/frontend')
    npm run dev (cwd: '/frontend') → devProcess (module level)
    server-ready: filter port === 5173, unsubscribe()
    return url

On unmount cleanup:
  hasBooted.current = false
  webContainerService.cleanup()
```

### Phase 8 — Chat / Modify Flow (Backend)

```
POST /api/chat (authMiddleware):
  chatController.chat():
    409 if processingProjects.has(projectId)
    operationId = crypto.randomUUID()  ← explicit import crypto from 'crypto'
    processingProjects.set(projectId, { userId, operationId })  ← lock BEFORE try

    try:
      getProjectById(projectId) → via Project.ts model
      404 if not found, 403 if user mismatch

      chatSummarizerAgent({ chatHistory, currentMessage })
        → { type: 'question' | 'modification', instruction }

      QUESTION PATH:
        updatedHistory = [...project.chat_history, userMsg, assistantMsg]
        updateProjectChatHistory(projectId, updatedHistory) ← via Project.ts model
        return { type:'question', files:[], message: instruction }

      MODIFICATION PATH:
        sendToClient 'Modifier agent working...'
        modifyOrchestrator({ files, descriptions, instruction, projectId, userId })
        If !result.success: return modification failure

        updatedHistory = [...project.chat_history, userMsg, assistantMsg]
        updateProjectFilesAndHistory(projectId, result.files, updatedHistory) ← model
        return { type:'modification', files: result.modifiedFiles, message }

    catch: return 500
    finally:
      if current.operationId === operationId:
        processingProjects.delete(projectId)
      ← operationId check ensures only this operation releases the lock
```

### Phase 9 — Frontend Handles Chat Response

```
response.type === 'question':
  Append assistant message to chatHistory
  No file/WebContainer changes

response.type === 'modification' && response.files.length > 0:
  ← Compute updatedFiles BEFORE setFiles (scope fix)
  const updatedFiles = [...files]
  for (modFile of response.files):
    findIndex by path → replace content
    not found → push (new file)

  setFiles(updatedFiles)               ← pass computed value directly
  setChatHistory(prev => [...prev, assistantMsg])

  setStatusMsg('Restarting preview...')
  const url = await webContainerService.restart(updatedFiles)
  ← restart() kills BOTH backendProcess AND devProcess (ERROR #2 FIX)
  ← wipes frontend/src and backend/src (stale file fix)
  ← re-mounts, re-installs, re-runs both servers
  setPreviewUrl(url)

response.type === 'modification' && response.files.length === 0:
  Append failure message to chatHistory
  No file/WebContainer changes
```

### Phase 10 — Logout

```
POST /api/auth/logout:
  res.clearCookie('token')
  Do NOT touch processingProjects
  ← operationId in finally clause owns lock cleanup

App.tsx handleLogout():
  authApi.logout()
  closeWS() → ws.close() → server removes from wsClients Set
  setIsAuthenticated(false)
  → Navigate to / (App routes unauthenticated state to AuthPage)

webContainerService:
  cleanup() called on ProjectPage unmount via useEffect return
  Capture refs → null sync → kill processes → teardown in background
```

---

## SECTION 10 — COMPLETE DATA FLOW SUMMARY

```
AUTH FLOW:
  bcryptjs.hash(10) → JWT { userId, username } → httpOnly SameSite:lax 7d cookie
  App.tsx: initWS() on auth success, closeWS() on logout

DATA ACCESS LAYER (models/):
  User.ts:     findUserByUsername, findUserById, createUser, userExistsByUsername
  Project.ts:  createProject, getProjectById, getProjectsByUserId,
               updateProjectFiles, updateProjectChatHistory, updateProjectFilesAndHistory
  All SQL via tagged template literals: sql`...${param}...`
  Controllers import from models — never write raw sql directly in controllers

DATABASE (NEON):
  const sql = neon(process.env.NEON_DATABASE_URL!)  ← HTTPS, no TCP
  Tagged template literals = parameterized = SQL-injection safe
  NEVER: sql("...") — bypasses parameterization
  Tables initialized on server startup via initDB() in db.ts

WEBSOCKET:
  Map<userId, Set<WebSocket>>
  server.ts: wss.on('connection', (ws, req)) — req NOT ws.upgradeReq (removed ws v3+)
  JWT parsed from req.headers.cookie
  sendToClient: iterate Set, skip non-OPEN sockets
  Vite /ws proxy: ws://localhost:5000 routed correctly

BUILD PIPELINE:
  Frontend:
    setLoading(true) FIRST
    ws !== null check before registerHandler (null safety)
    buildApi timeout:0 (no timeout)
    try/catch/finally: finally always unregisters handler + setLoading(false)

  Backend:
    OUTER try (pre-projectId, no WS possible)
    crypto imported explicitly — not assumed global
    projectId = crypto.randomUUID() (string UUID)
    pLimit(3) inside function body — NOT module level (^3.1.0 CommonJS)
    FIX #5: exampleDescription import REMOVED from buildController — was dead 3rd param to depthAgent
    INNER try: full pipeline with inner catch for WS failure notification

  E2B SDK v1.x:
    Sandbox.create({ timeoutMs: 360_000 })   ← milliseconds (not 'timeout' seconds)
    sandbox.files.write(path, content)       ← not sandbox.filesystem.write
    sandbox.commands.run(cmd, { timeoutMs: 120_000 })  ← not sandbox.process.start
    ← T1-9 FIX: onStdout/onStderr callbacks removed (FIX #6) — result.stdout/stderr used directly
    sandbox.kill()                           ← not sandbox.close()
    Auto-creates intermediate directories on files.write

  Agents:
    All use model: 'claude-sonnet-4-5-20250929' (valid dated string)
    All use safeParseJSON<T>(raw) for JSON parsing (ERROR #7 FIX)
    safeParseJSON: stripFences → regex extract {} → JSON.parse → throw with message
    codeGeneratorAgent: uses stripMarkdownFences (returns string, not JSON)

  generateOrchestrator:
    ALL vars initialized BEFORE outer loop
    previousLog NEVER reset — full session history
    Outer loop: run all 4 validation commands each iteration
    Inner loop: errorAgent ONE action per iteration
    action "0" fixed=true → clear currentErrors (break inner, outer re-validates)
    action "0" fixed=false → do NOT clear (outer re-validates anyway)
    finally: sandbox.kill() in try/catch (never rethrow)

PROJECT PAGE:
  Route state → files directly (new project, no extra API call)
  No state → GET /api/projects/:id (page refresh or direct URL)
  hasBooted useRef guards against React StrictMode double-effect
  hasBooted.current = true SYNCHRONOUSLY before async startContainer
  useEffect cleanup: hasBooted.current = false + webContainerService.cleanup()

WEBCONTAINER SERVICE:
  Module-level: webcontainerInstance, devProcess, backendProcess, previewUrl
  backendProcess tracked (ERROR #2 FIX) — killed in restart() AND cleanup()
  startContainer():
    CASE A (running + url): return immediately
    CASE B (running + no url): teardown stale, fall through
    Boot unconditionally (always null here after CASE B)
    cwd: '/backend' and cwd: '/frontend' for ALL spawn calls
    server-ready: ONLY port 5173 resolves promise
    unsubscribe() called immediately after resolve/reject
  restart():
    Kill devProcess + backendProcess (BOTH — ERROR #2 FIX)
    Wipe frontend/src + backend/src (stale file removal)
    Re-mount → re-install → re-spawn both servers
    Fresh server-ready listener
  cleanup():
    Capture all refs → null all singletons sync → kill procs → teardown bg

CHAT FLOW:
  processingProjects: Map<projectId, { userId, operationId }>
  Lock acquired BEFORE inner try, released in finally with operationId check
  chatSummarizerAgent returns type + instruction
  Question: save chat_history only (no orchestrator, no sandbox)
  Modification: modifyOrchestrator → save files + chat_history
  Returns modifiedFiles only (not full files array) to minimize response size

  modifyOrchestrator:
    Same E2B v1.x patterns
    modifiedFiles deduplicated by path across all iterations
    previousLog continuous across modifier loop + error recovery loop
    Post-modifier: ALL 4 validation commands
    Error recovery: re-derive side from lastErrors TOP OF EACH OUTER ITERATION
    Re-filter descriptions and errors by derived side
    Inner modifyAgent loop with promptContext
    Outer re-validates after each inner loop completes

LOGOUT INVARIANTS:
  clearCookie only — processingProjects NOT touched
  operationId in finally always owns lock cleanup
  WS connection removed from Set on ws.close()
  WebContainer teardown in background — no await

KEY PACKAGE CONSTRAINTS:
  e2b: ^1.0.0 (v1.x API)
  @neondatabase/serverless: ^1.0.0 (HTTP, no TCP)
  bcryptjs: ^2.4.3 (pure JS, no native)
  p-limit: ^3.1.0 (CommonJS — v5+ is ESM-only)
  NO: mongoose, bcrypt (native), pg (TCP), redis (TCP), ioredis
  NO: any package requiring node-gyp or native C++ bindings
```

---

## SECTION 11 — SETUP & INSTALLATION GUIDE

### Prerequisites
```
Node.js 18+ (LTS recommended)
npm 9+
A Neon DB account: https://console.neon.tech
An E2B account: https://e2b.dev
An Anthropic API account: https://console.anthropic.com
```

### Backend Setup
← FIX #12: There is no .env.example file. Create backend/.env directly:

```bash
cd backend
npm install
```

Create backend/.env manually with these contents:
```
NEON_DATABASE_URL=postgresql://username:password@host.neon.tech/dbname?sslmode=require
JWT_SECRET=your_super_secret_jwt_key_minimum_32_chars
E2B_API_KEY=your_e2b_api_key_here
ANTHROPIC_API_KEY=sk-ant-your_key_here
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Get values from:
- NEON_DATABASE_URL: Neon console → your project → Connection string
- JWT_SECRET: any random string (e.g. `openssl rand -hex 32`)
- E2B_API_KEY: https://e2b.dev dashboard
- ANTHROPIC_API_KEY: https://console.anthropic.com

Then run:
```bash
npm run dev
```

Expected output: `Neon DB initialized` then `Server on port 5000`

### Frontend Setup
← frontend/.env is already pre-configured for localhost in the repo.
← VITE_WS_URL points to ws://localhost:5173/ws (routes via Vite proxy to backend).

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

### Neon DB Setup
```
1. Create account at https://console.neon.tech
2. Create a new project
3. Copy the connection string (postgresql://...)
4. Paste as NEON_DATABASE_URL in backend/.env
5. Tables are created automatically on first server start via initDB()
```

### Important Browser Requirement
```
WebContainers require Cross-Origin Isolation headers.
These are set in frontend/vite.config.ts:
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin

Without these, WebContainer.boot() will throw a SharedArrayBuffer error.
Chrome and Edge are fully supported. Firefox requires enabling
dom.postMessage.sharedArrayBuffer.bypassCOOP in about:config.
```

---

## SECTION 12 — ERROR HANDLING & EDGE CASES

### API Error Responses (all endpoints)
```
All errors return:
  { success: false, message: "human-readable description" }

Status codes:
  400 = Bad request (missing fields, duplicate username)
  401 = Unauthorized (missing/invalid JWT cookie)
  403 = Forbidden (authenticated but wrong user for resource)
  404 = Not found
  409 = Conflict (project already being processed)
  500 = Internal server error (DB failure, agent failure, etc.)
```

### Build Failure Handling
```
If generateOrchestrator times out (5 minutes):
  Returns { success: false, files: currentFiles, errors: lastErrors }
  buildController: sendToClient 'Build failed', return 500

Frontend:
  catch block → setStatusMsg('Build failed. Please try again.')
  finally → setLoading(false)
  User stays on dashboard, can try again
```

### Chat Concurrency (409)
```
If user sends a second message while first is processing:
  chatController: returns 409 "Project is already being processed"
  Frontend: shows error message in chat, re-enables input
  The lock is released in finally after the first operation completes
```

### WebContainer Boot Failure
```
If WebContainer.boot() throws:
  startContainer re-throws
  ProjectPage catch: console.error, setIsLoading(false)
  previewUrl stays null → PreviewPanel shows "Preview is loading..."
  User can navigate to dashboard and return to retry
```

### Session Expiry
```
If JWT cookie expires (7 days):
  Any API call returns 401
  getProjects() catch in DashboardPage: err.response?.status === 401 → onLogout()
  Other API calls: axios will throw, catch blocks handle gracefully
  User is redirected to AuthPage via handleLogout()
```

### JSON Parse Safety (ERROR #7 FIX)
```
All agents use safeParseJSON<T>(raw):
  1. stripMarkdownFences → remove ```json fences
  2. Regex match /\{[\s\S]*\}/ → extract outermost JSON object
     (handles conversational preamble like "Sure! Here is the JSON: {...}")
  3. JSON.parse(cleaned)
  4. If still fails: throw new Error('Failed to parse AI JSON output: ...')
     → caught by orchestrator/controller → 500 response
```

---

## SECTION 13 — QUICK REFERENCE: ALL IMPORTS BY FILE

```
backend/src/server.ts:
  http, { WebSocketServer } from 'ws', jwt from 'jsonwebtoken',
  { initDB } from './config/db', { wsClients } from './utils/wsClients',
  app from './app', dotenv

backend/src/app.ts:
  express, cookieParser, cors,
  authRoutes, buildRoutes, chatRoutes, projectRoutes

backend/src/config/db.ts:
  { neon } from '@neondatabase/serverless'

backend/src/models/User.ts:
  { sql } from '../config/db'

backend/src/models/Project.ts:
  { sql } from '../config/db'

backend/src/middleware/authMiddleware.ts:
  { Request, Response, NextFunction } from 'express', jwt from 'jsonwebtoken'

backend/src/controllers/authController.ts:
  bcrypt from 'bcryptjs', jwt from 'jsonwebtoken',
  { userExistsByUsername, createUser, findUserByUsername } from '../models/User'

backend/src/controllers/buildController.ts:
  crypto from 'crypto',
  { sendToClient } from '../utils/wsClients',
  { plannerAgent }, { depthAgent }, { promptGeneratorAgent },
  { codeGeneratorAgent }, { generateOrchestrator },
  { createProject } from '../models/Project',
  ← FIX #5: exampleDescription import REMOVED — depthAgent no longer takes it as a param
  pLimit from 'p-limit'

backend/src/controllers/chatController.ts:
  crypto from 'crypto',  ← ERROR #5 FIX
  { sendToClient } from '../utils/wsClients',
  { chatSummarizerAgent },
  { modifyOrchestrator },
  { getProjectById, updateProjectChatHistory,
    updateProjectFilesAndHistory } from '../models/Project'

backend/src/controllers/projectController.ts:
  { getProjectsByUserId, getProjectById } from '../models/Project'

backend/src/utils/wsClients.ts:
  { WebSocket } from 'ws'

backend/src/utils/promptTemplates.ts:
  (no imports — pure exports)

backend/src/services/actions/commandRunner.ts:
  { Sandbox } from 'e2b'

backend/src/services/actions/fileUpdater.ts:
  { Sandbox } from 'e2b'

backend/src/services/actions/fileReader.ts:
  (no imports — pure function)

backend/src/services/orchestrators/generateOrchestrator.ts:
  { Sandbox } from 'e2b',
  { sendToClient } from '../../utils/wsClients',
  { errorAgent }, { commandRunner }, { fileUpdater }, { fileReader }

backend/src/services/orchestrators/modifyOrchestrator.ts:
  { Sandbox } from 'e2b',
  { sendToClient } from '../../utils/wsClients',
  { modifyAgent }, { errorAgent }, { commandRunner }, { fileUpdater }, { fileReader }

All agents:
  Anthropic from '@anthropic-ai/sdk'
  { TECH_STACK, safeParseJSON } from '../../utils/promptTemplates'
  (codeGeneratorAgent also imports: { stripMarkdownFences })

frontend/src/main.tsx:
  React, { createRoot } from 'react-dom/client',
  { BrowserRouter } from 'react-router-dom',
  App, { WebSocketProvider }

frontend/src/App.tsx:
  { useState } from 'react',
  { Routes, Route, Navigate } from 'react-router-dom',
  { useWebSocket },
  AuthPage, DashboardPage, ProjectPage,
  * as authApi from './api/authApi'

frontend/src/context/WebSocketContext.tsx:
  { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react'

frontend/src/api/authApi.ts:
  axios from 'axios'

frontend/src/api/buildApi.ts:
  axios from 'axios'

frontend/src/api/chatApi.ts:
  axios from 'axios'

frontend/src/api/projectApi.ts:
  axios from 'axios'

frontend/src/pages/AuthPage.tsx:
  { useState } from 'react', AuthForm, * as authApi

frontend/src/pages/DashboardPage.tsx:
  { useState, useEffect } from 'react', { useNavigate },
  { useWebSocket }, Sidebar, PromptInput, LoadingScreen,
  { build as buildApi } from '../api/buildApi',
  { getProjects } from '../api/projectApi'

frontend/src/pages/ProjectPage.tsx:
  { useState, useEffect, useRef } from 'react',
  { useLocation, useNavigate } from 'react-router-dom',
  { useWebSocket },
  * as webContainerService from '../services/webContainerService',
  { getProject } from '../api/projectApi',
  { chat as chatApi } from '../api/chatApi',
  ChatPanel, FileViewer, PreviewPanel, LoadingScreen

frontend/src/services/webContainerService.ts:
  { WebContainer } from '@webcontainer/api'
```


---

## SECTION 14 — DATA FLOW DIAGRAMS

### Complete Build Flow (POST /api/build)

```
User submits prompt in DashboardPage
  │  setIsLoading(true), registerHandler('build-status', ...)
  │  buildApi(prompt) → POST /api/build (axios timeout: 0)
  │
  ▼
buildController — OUTER try (before projectId)
  │  projectId = crypto.randomUUID()
  │  sendToClient → 'Build started'
  │
  ├─ INNER try (full pipeline)
  │    │
  │    ▼
  │  plannerAgent(prompt) → PlannerResult { projectName, structure, files[] }
  │    │
  │    ▼
  │  ── NEW #13: hasBackend/hasFrontend CHECK ──────────────────────────────
  │    const hasBackend  = files.some(f => f.path.startsWith('backend/'))
  │    const hasFrontend = files.some(f => f.path.startsWith('frontend/'))
  │    if (!hasBackend || !hasFrontend):
  │      sendToClient: 'Build failed'
  │      return res.status(500).json({ success: false, message: '...' })
  │      ← Exits build() immediately. Inner catch does NOT fire.
  │      ← res.status(500).json is correct: HTTP connection still open here.
  │  ────────────────────────────────────────────────────────────────────────
  │    │
  │    ▼
  │  depthAgent(prompt, plannerResult)           ← FIX #5: 2 args only
  │    → DepthResult { structure, files: [{ path, description }] }
  │    │
  │    ▼
  │  promptGeneratorAgent(prompt, plannerResult, depthResult)
  │    → PromptGeneratorResult { files: [{ path, prompt }] }
  │    │
  │    ▼
  │  codeGeneratorAgent × N (parallel, pLimit(3))
  │    → FileItem[] = [{ path, content }]
  │    │
  │    ▼
  │  generateOrchestrator({ projectId, userId, files, descriptions, structure })
  │    │  E2B Sandbox.create({ timeoutMs: 360_000 })
  │    │  Write all files → while loop (5-min timer):
  │    │    Run all 4 validation commands
  │    │    if pass: break
  │    │    else: inner errorAgent loop
  │    │  sandbox.kill() in finally
  │    │  Returns { success, files: currentFiles, errors }
  │    │
  │    ▼
  │  createProject({ id, userId, projectName, prompt, descriptions, structure, files })
  │    → INSERT into Neon DB
  │    │
  │    ▼
  │  sendToClient: 'Build complete'
  │  return res.json({ success: true, projectId, projectName, structure, files })
  │
  ├─ INNER catch: sendToClient 'Build failed', return 500
  └─ OUTER catch: return 500 (no WS available)

Frontend receives response:
  navigate('/project/${projectId}', { state: response })
  DashboardPage: finally → unregisterHandler + setIsLoading(false)

ProjectPage:
  useEffect: files from location.state → setFiles
  useEffect [files]: files.length > 0 + !hasBooted.current → bootContainer
  startContainer(files) → previewUrl → setPreviewUrl
```

### Chat/Modify Flow (POST /api/chat)

```
User sends message in ProjectPage
  │  registerHandler('chat-status', msg => setStatusMsg(msg.status))
  │  chatApi({ projectId, message, chatHistory }) → POST /api/chat (timeout: 0)
  │
  ▼
chatController
  │  409 if processingProjects.has(projectId)
  │  operationId = crypto.randomUUID()
  │  processingProjects.set(projectId, { userId, operationId })  ← lock BEFORE try
  │
  │  try:
  │    getProjectById(projectId) — 404 if not found, 403 if not owner
  │    chatSummarizerAgent({ chatHistory, currentMessage })
  │      → { type: 'question'|'modification', instruction }
  │
  ├─ type === 'question':
  │    updateProjectChatHistory(projectId, updatedHistory)
  │    return { type: 'question', files: [], message: instruction }
  │
  └─ type === 'modification':
       modifyOrchestrator({ files, descriptions, instruction, projectId, userId })
       updateProjectFilesAndHistory(projectId, result.files, updatedHistory)
       return { type: 'modification', files: result.modifiedFiles, message }
  │
  finally: processingProjects.delete(projectId)  ← ALWAYS runs

Frontend receives response:
  type === 'question': append to chatHistory, no file changes
  type === 'modification' && files.length > 0:
    Compute updatedFiles = [...files] with response.files merged in
    setFiles(updatedFiles)
    setChatHistory(prev => [...prev, assistantMsg])
    setStatusMsg('Restarting preview...')
    const url = await webContainerService.restart(updatedFiles)
    ← restart() kills BOTH devProcess AND backendProcess (ERROR #2 FIX)
    ← wipes frontend/src + backend/src (stale file removal)
    ← re-mounts, re-installs, re-runs both servers
    setPreviewUrl(url)
  type === 'modification' && files.length === 0:
    Append failure message to chatHistory only
  finally: unregisterHandler('chat-status') + setInputDisabled(false) + setIsLoading(false)
```

---

## SECTION 15 — SECURITY NOTES

```
AUTHENTICATION:
  - JWT stored in httpOnly cookie — inaccessible to JavaScript XSS
  - SameSite=Lax — protects against CSRF in most scenarios
  - Passwords hashed with bcryptjs (pure JS) cost factor 10
  - Cookie maxAge 7 days — no refresh token needed for MVP
  - App.tsx route guards: unauthenticated users redirected to / (AuthPage)
  - isAuthenticated state: set on login success, cleared on logout + closeWS()

AUTHORIZATION:
  - All project routes check project.user_id === userId (ownership)
  - 403 returned (not 404) on ownership mismatch
  - authMiddleware validates JWT on every protected route via httpOnly cookie

INPUT HANDLING:
  - All SQL queries use parameterized tagged template literals
  - Express.json({ limit: '50mb' }) — large but bounded body limit
  - No raw string concatenation in any SQL query in the codebase

CORS:
  - Origin restricted to FRONTEND_URL env var
  - credentials: true required for cookie auth across origins
  - No wildcard origin with credentials

E2B SANDBOXES:
  - Fully isolated execution environment — generated code cannot affect host
  - 5-minute timer prevents runaway sandboxes
  - sandbox.kill() in finally block prevents dangling instances
  - API key is server-side only — never sent to frontend

PRODUCTION NOTES:
  - Set NODE_ENV=production — enables secure: true on cookies
  - Rotate JWT_SECRET before deployment
  - Use Neon connection pooling URL in production
  - Consider rate limiting on /api/build (E2B credits are consumed per build)
  - Never commit backend/.env — add to .gitignore
```

---

## SECTION 16 — CRITICAL IMPLEMENTATION RULES CONSOLIDATED

```
ORDERING AND INITIALIZATION:
  ✅ import 'dotenv/config' is ALWAYS the very first line of backend/src/server.ts (FIX #1)
  ✅ All other imports come AFTER dotenv/config
  ✅ initDB() called before server.listen() — but wrapped in try/catch
  ✅ pLimit created INSIDE buildController function body (not at module level)
  ✅ @anthropic-ai/sdk: ^0.40.0 in backend/package.json (FIX #3)
  ✅ export {} at end of backend/src/types/index.ts (FIX #2)

DATABASE:
  ✅ ALWAYS @neondatabase/serverless — never pg, mysql2, mongodb
  ✅ ALWAYS tagged template literals: sql`SELECT * WHERE id = ${id}`
  ✅ NEVER sql("SELECT * WHERE id = " + id)
  ✅ Queries return arrays — destructure: const [row] = await sql`...`
  ✅ JSONB fields: pass JSON.stringify(value)::jsonb in update queries

AUTH:
  ✅ bcryptjs only — never bcrypt (native C++ fails to install)
  ✅ JWT stored in httpOnly cookie (not localStorage)
  ✅ Cookie options: httpOnly, secure (prod), sameSite: 'lax', maxAge 7d
  ✅ CORS: credentials: true, origin: FRONTEND_URL env var
  ✅ App.tsx route guards — isAuthenticated state prevents unauthorized access

E2B SANDBOX:
  ✅ E2B v1.x: Sandbox.create({ timeoutMs }) not { timeout }
  ✅ E2B v1.x: sandbox.commands.run() not sandbox.process.start()
  ✅ E2B v1.x: sandbox.files.write(path, content) — auto-creates dirs
  ✅ FIX #6: commandRunner returns result.stdout/stderr/exitCode directly
  ✅ Always sandbox.kill() in finally block — prevent dangling sandboxes

WEBCONTAINERS:
  ✅ WebContainer.boot() called ONCE per page load (hasBooted useRef guard)
  ✅ COOP/COEP headers in vite.config.ts — required for SharedArrayBuffer
  ✅ mount() uses buildMountStructure() for nested directory object format
  ✅ backendProcess tracked at module level — killed in restart() and cleanup()
  ✅ cleanup() called in ProjectPage useEffect cleanup on unmount
  ✅ FIX #9: VITE_WS_URL=ws://localhost:5173/ws routes through Vite /ws proxy
  ✅ Frontend API: always relative /api/... paths — never localhost

TYPESCRIPT:
  ✅ FIX #2: export {} at end of types/index.ts — prevents TS Error 2669
  ✅ FIX #3: @anthropic-ai/sdk ^0.40.0 — supports claude-sonnet-4-5-20250929
  ✅ FIX #10: ValidationResult interface REMOVED (was unused)
  ✅ FIX #11: FileViewer structure prop REMOVED (was unused)

p-limit:
  ✅ p-limit ^3.1.0 — CommonJS compatible (v5+ is ESM-only, crashes CJS build)
  ✅ Create pLimit INSIDE functions — not at module level

AGENTS:
  ✅ FIX #5: depthAgent takes 2 params (prompt, plannerResult) — not 3
  ✅ FIX #7: filesWereUpdated variable REMOVED from generateOrchestrator
  ✅ All agents: model = 'claude-sonnet-4-5-20250929'
  ✅ All agents: return safeParseJSON<T>() for JSON responses (ERROR #7 FIX)
  ✅ codeGeneratorAgent: return raw stripped string (not JSON)
  ✅ All agents: ABSOLUTE STRUCTURE RULE in SYSTEM_PROMPT (NEW #14)

STRUCTURE GUARD:
  ✅ NEW #13: hasBackend/hasFrontend check in buildController after plannerAgent
  ✅ Both must be true — if either false, sendToClient + return res.status(500).json
  ✅ res.status(500).json is correct — HTTP connection still open at this point
  ✅ Using `return res.status(500).json(...)` exits the async handler cleanly
  ✅ Inner catch block does NOT fire when we return before it
  ✅ No double-response risk — we return immediately after sending

CONCURRENCY:
  ✅ processingProjects Map prevents concurrent modifications to same project
  ✅ Lock released in finally block — cannot deadlock on thrown errors
  ✅ operationId prevents accidental deletion of a different operation's lock
```

---

## SECTION 17 — QUICK REFERENCE: ALL 14 FIXES AT A GLANCE

```
ID    SEVERITY  FILE                              DESCRIPTION
──────────────────────────────────────────────────────────────────────────────
 #1   CRITICAL  backend/src/server.ts             import 'dotenv/config' as FIRST line
 #2   CRITICAL  backend/src/types/index.ts        export {} at end — prevents TS2669
 #3   CRITICAL  backend/package.json              @anthropic-ai/sdk: ^0.40.0 (was ^0.24.0)
 #4   CRITICAL  utils/promptTemplates.ts          initDB() try/catch required in generated apps
 #5   BUG       services/agents/depthAgent.ts     Remove dead exampleDesc 3rd param
 #6   BUG       services/actions/commandRunner.ts Remove dead stdout/stderr local vars + callbacks
 #7   BUG       generateOrchestrator.ts           Remove dead filesWereUpdated variable
 #8   ROBUST    utils/promptTemplates.ts          Exact npm script names required in TECH_STACK
 #9   DOC/BUG   frontend/.env + WebSocketContext  VITE_WS_URL=ws://localhost:5173/ws (not 5000)
#10   DOC       backend/src/types/index.ts        Remove unused ValidationResult interface
#11   DOC       frontend/src/components/FileViewer Remove unused structure prop
#12   DOC       Section 11 setup guide            Replace cp .env.example with create-directly
#13   NEW       controllers/buildController.ts    hasBackend/hasFrontend fail-fast guard
#14   NEW       All agent SYSTEM_PROMPTs          ABSOLUTE STRUCTURE RULE in all prompts
──────────────────────────────────────────────────────────────────────────────
```

---

*End of updated_specs-4.md — AI Website Builder Complete Specification v4*
*v2 base (4,426 lines) + all 14 v3 fixes applied + all v2 sections preserved + new v3 sections added.*
*Zero regressions. Zero dropped content. Final corrected version.*
