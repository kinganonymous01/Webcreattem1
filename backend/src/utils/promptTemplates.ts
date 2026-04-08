export function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:\w+)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
}

export function safeParseJSON<T>(raw: string): T {
  let cleaned = stripMarkdownFences(raw);

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    throw new Error(`Failed to parse AI JSON output: ${(e as Error).message}`);
  }
}

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
   - DEFAULT TYPE-NARROWING METHOD (use this first): assign env vars to a local const, then guard with an explicit runtime check that throws if missing.
     Example:
       const databaseUrl = process.env.DATABASE_URL;
       if (!databaseUrl) {
         throw new Error('DATABASE_URL is required');
       }
       const sql = neon(databaseUrl);
   - If this default method does not fit a specific file context, you may choose another safe TypeScript narrowing strategy (type guard/helper/assertion) at your discretion.
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
     const databaseUrl = process.env.DATABASE_URL
     if (!databaseUrl) throw new Error('DATABASE_URL is required')
     const sql = neon(databaseUrl)
     export async function initDB() {
       await sql\`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, ...)\`
     }
   Call initDB() in server.ts before starting the HTTP server.

9. FILESYSTEM:
   The WebContainer filesystem is ephemeral and in-memory.
   All persistent storage must go through Neon DB or Upstash Redis.

10. DATABASE INITIALIZATION MUST BE FAULT-TOLERANT:
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

11. PACKAGE.JSON SCRIPTS — EXACT NAMES REQUIRED:
    backend/package.json MUST contain EXACTLY these script names:
      "dev":   "nodemon --exec ts-node src/server.ts"
      "build": "tsc"
    frontend/package.json MUST contain EXACTLY these script names:
      "dev":   "vite"
      "build": "tsc && vite build"
    The build validation system runs 'npm run build' and 'npm run dev' verbatim.
    Using any other script names (e.g. 'start', 'serve', 'compile') means the
    validation commands fail with exit code 1 and the build times out in 5 minutes.

12. TYPESCRIPT ENV + IMPORT SAFETY:
    - For ALL environment variables in TypeScript, use the DEFAULT TYPE-NARROWING METHOD first:
      1) assign process.env value to a local const
      2) guard with an explicit runtime check
      3) use the narrowed value
    - If and only if that method is not suitable for a specific file, choose another safe narrowing method intelligently.
    - For local TypeScript source imports, NEVER include .ts/.tsx extensions.
      Examples:
      - Use: import App from './App'
      - Never: import App from './App.tsx'
      - Use: import app from './app'
      - Never: import app from './app.ts'

════════════════════════════════════════════════════════════════
ABSOLUTE STRUCTURE RULE — APPLIES TO ALL GENERATED APPLICATIONS:
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
`;

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
`;
