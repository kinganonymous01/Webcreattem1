import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.NEON_DATABASE_URL!);

export async function initDB(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      username   TEXT        UNIQUE NOT NULL,
      password   TEXT        NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
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
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)
  `;
  console.log('Neon DB initialized');
}
