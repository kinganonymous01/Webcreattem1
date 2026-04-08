# Validation Failure Analysis (from `bb2222222.txt`)

## Why even simple projects fail validation

The failures are caused by two interacting issues:

1. **The generator repeatedly emits TypeScript that does not compile**
   - Backend compile error: `neon(process.env.DATABASE_URL)` with strict TypeScript causes `string | undefined` mismatch.
   - Frontend compile error: `import App from './App.tsx'` with current TS config triggers TS5097.

2. **The orchestrator hides the useful compiler diagnostics from the fixing agent**
   - When a command fails, `generateOrchestrator` stores `result.stderr || result.stdout` as the error text.
   - For these build failures, `stderr` is just `exit status 2`, while actual TypeScript details are in `stdout`.
   - So the error-fixing loop receives only `exit status 2`, not actionable compiler messages.

## Evidence captured in the log

- Backend build error includes real TS diagnostic in `stdout`:
  - `src/config/db.ts(5,25): error TS2345: Argument of type 'string | undefined' ...`
- Frontend build error includes real TS diagnostic in `stdout`:
  - `src/main.tsx(3,17): error TS5097: An import path can only end with a '.tsx' extension ...`
- Validation error list later contains only:
  - `"error": "exit status 2"` for backend and frontend.

This means the fix loop is effectively blind.

## Structural root causes in prompts/template

The prompt flow itself encourages the failing code patterns:

- Prompt asks for `const sql = neon(process.env.DATABASE_URL)` directly.
- Prompt asks for imports with `.ts` / `.tsx` extensions (e.g., `./app.ts`, `./App.tsx`).
- Frontend TS config does **not** enable `allowImportingTsExtensions`, so `.tsx` import paths fail in type-check.

## Bottom line

Projects are not failing because they are complex; they fail because:

- The generated starter files contain deterministic TS compile mistakes.
- The auto-repair stage loses the only useful error context (`stdout`) and keeps only `exit status 2`.

So even a trivial counter app fails the same way.
