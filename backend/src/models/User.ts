import { sql } from '../config/db';

export interface UserRow {
  id:         string;
  username:   string;
  password:   string;
  created_at: Date;
}

export async function findUserByUsername(username: string): Promise<UserRow | undefined> {
  const rows = await sql`
    SELECT id, username, password, created_at
    FROM users
    WHERE username = ${username}
  `;
  return rows[0] as UserRow | undefined;
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  const rows = await sql`
    SELECT id, username, password, created_at
    FROM users
    WHERE id = ${id}
  `;
  return rows[0] as UserRow | undefined;
}

export async function createUser(username: string, passwordHash: string): Promise<UserRow> {
  const rows = await sql`
    INSERT INTO users (username, password)
    VALUES (${username}, ${passwordHash})
    RETURNING id, username, password, created_at
  `;
  return rows[0] as UserRow;
}

export async function userExistsByUsername(username: string): Promise<boolean> {
  const rows = await sql`
    SELECT id FROM users WHERE username = ${username}
  `;
  return rows.length > 0;
}
