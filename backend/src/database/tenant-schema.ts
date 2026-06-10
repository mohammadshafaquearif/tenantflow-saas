import type { PoolClient } from 'pg';
import { TenantConnectionManager } from './connection-manager.js';
import { withDdlClient } from './ddl.js';

async function createTenantTables(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL CHECK (role IN ('TENANT_ADMIN', 'MANAGER', 'MEMBER', 'VIEWER')),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'todo'
        CHECK (status IN ('todo', 'in_progress', 'done')),
      priority VARCHAR(50) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
      assignee_id UUID REFERENCES users(id),
      created_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id)');
}

/**
 * Provision isolated tenant schema + tables on a **direct** DB connection.
 * Must NOT run on pooled/serverless connections (Neon/Vercel Postgres).
 */
export async function provisionTenantSchema(schemaName: string): Promise<void> {
  TenantConnectionManager.assertValidSchemaName(schemaName);

  await withDdlClient(async (client) => {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    await client.query(`SET search_path TO ${schemaName}`);
    await createTenantTables(client);
    await client.query('SET search_path TO public');
  });
}

/** Roll back a failed tenant registration */
export async function dropTenantSchema(schemaName: string): Promise<void> {
  TenantConnectionManager.assertValidSchemaName(schemaName);
  await withDdlClient(async (client) => {
    await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
  });
}
