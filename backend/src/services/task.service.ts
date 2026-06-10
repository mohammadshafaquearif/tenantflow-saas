import { db } from '../database/connection-manager.js';
import type { Task, TaskPriority, TaskStatus } from '../types/index.js';
import { NotFoundError } from '../utils/errors.js';

export async function listTasks(schemaName: string, projectId: string): Promise<Task[]> {
  return db.withTenant(schemaName, async (client) => {
    const { rows } = await client.query<Task>(
      'SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId],
    );
    return rows;
  });
}

export async function createTask(
  schemaName: string,
  input: {
    projectId: string;
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    createdBy: string;
  },
): Promise<Task> {
  return db.withTenant(schemaName, async (client) => {
    const { rows } = await client.query<Task>(
      `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        input.projectId,
        input.title,
        input.description ?? null,
        input.status ?? 'todo',
        input.priority ?? 'medium',
        input.assigneeId ?? null,
        input.createdBy,
      ],
    );
    return rows[0];
  });
}

export async function updateTask(
  schemaName: string,
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'assignee_id'>>,
): Promise<Task> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    throw new NotFoundError('No fields to update');
  }

  fields.push('updated_at = NOW()');
  values.push(taskId);

  return db.withTenant(schemaName, async (client) => {
    const { rows } = await client.query<Task>(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    if (!rows[0]) throw new NotFoundError('Task not found');
    return rows[0];
  });
}

export async function deleteTask(schemaName: string, taskId: string): Promise<void> {
  return db.withTenant(schemaName, async (client) => {
    const { rowCount } = await client.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    if (!rowCount) throw new NotFoundError('Task not found');
  });
}
