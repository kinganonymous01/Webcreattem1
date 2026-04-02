import { sql } from '../config/db';

export interface ProjectRow {
  id:           string;
  user_id:      string;
  project_name: string;
  prompt:       string;
  descriptions: any;
  structure:    any;
  files:        any;
  chat_history: any;
  created_at:   Date;
}

export async function createProject(params: {
  id:           string;
  userId:       string;
  projectName:  string;
  prompt:       string;
  descriptions: any;
  structure:    any;
  files:        any;
}): Promise<ProjectRow> {
  const { id, userId, projectName, prompt, descriptions, structure, files } = params;
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
  `;
  return rows[0] as ProjectRow;
}

export async function getProjectById(id: string): Promise<ProjectRow | undefined> {
  if (!id || id === 'undefined') {
    return undefined;
  }
  const rows = await sql`
    SELECT * FROM projects WHERE id = ${id}
  `;
  return rows[0] as ProjectRow | undefined;
}

export async function getProjectsByUserId(userId: string): Promise<{ id: string; project_name: string; created_at: Date }[]> {
  const rows = await sql`
    SELECT id, project_name, created_at
    FROM projects
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows as { id: string; project_name: string; created_at: Date }[];
}

export async function updateProjectFiles(id: string, files: any): Promise<void> {
  await sql`
    UPDATE projects
    SET files = ${JSON.stringify(files)}::jsonb
    WHERE id = ${id}
  `;
}

export async function updateProjectChatHistory(id: string, chatHistory: any): Promise<void> {
  await sql`
    UPDATE projects
    SET chat_history = ${JSON.stringify(chatHistory)}::jsonb
    WHERE id = ${id}
  `;
}

export async function updateProjectFilesAndHistory(id: string, files: any, chatHistory: any): Promise<void> {
  await sql`
    UPDATE projects
    SET
      files        = ${JSON.stringify(files)}::jsonb,
      chat_history = ${JSON.stringify(chatHistory)}::jsonb
    WHERE id = ${id}
  `;
}
