import { db } from '../database/connection-manager.js';
import type { Project } from '../types/index.js';
import { NotFoundError } from '../utils/errors.js';

export async function listProjects(schemaName: string): Promise<Project[]> {
  return db.withTenant(schemaName, async (client) => {
    const { rows } = await client.query<Project>(
      'SELECT * FROM projects ORDER BY created_at DESC',
    );
    return rows;
  });
}

export async function createProject(
  schemaName: string,
  input: { name: string; description?: string; createdBy: string },
): Promise<Project> {
  return db.withTenant(schemaName, async (client) => {
    const { rows } = await client.query<Project>(
      `INSERT INTO projects (name, description, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [input.name, input.description ?? null, input.createdBy],
    );
    return rows[0];
  });
}

export async function getProject(schemaName: string, projectId: string): Promise<Project> {
  return db.withTenant(schemaName, async (client) => {
    const { rows } = await client.query<Project>(
      'SELECT * FROM projects WHERE id = $1',
      [projectId],
    );
    if (!rows[0]) throw new NotFoundError('Project not found');
    return rows[0];
  });
}

export async function deleteProject(schemaName: string, projectId: string): Promise<void> {
  return db.withTenant(schemaName, async (client) => {
    const { rowCount } = await client.query('DELETE FROM projects WHERE id = $1', [projectId]);
    if (!rowCount) throw new NotFoundError('Project not found');
  });
}
