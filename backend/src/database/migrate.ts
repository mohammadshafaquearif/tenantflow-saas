import { config } from '../config/index.js';
import { db } from './connection-manager.js';
import { TenantConnectionManager } from './connection-manager.js';
import { executeDdl } from './ddl.js';

const PUBLIC_MIGRATIONS = `
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  schema_name VARCHAR(120) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);
`;

const TENANT_SCHEMA_TEMPLATE = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('TENANT_ADMIN', 'MANAGER', 'MEMBER', 'VIEWER')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assignee_id UUID REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
`;

export async function runMigrations(): Promise<void> {
  await executeDdl('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await executeDdl(PUBLIC_MIGRATIONS);

  const rows = await executeDdl<{ schema_name: string }>(
    'SELECT schema_name FROM tenants WHERE is_active = true',
  );

  for (const { schema_name } of rows) {
    TenantConnectionManager.assertValidSchemaName(schema_name);
    await executeDdl(`CREATE SCHEMA IF NOT EXISTS ${schema_name}`);
    await executeDdl(`SET search_path TO ${schema_name}`);
    await executeDdl(TENANT_SCHEMA_TEMPLATE);
    await executeDdl('SET search_path TO public');
    console.log(`Migrated tenant schema: ${schema_name}`);
  }

  console.log('Migrations complete.');
}

const isCli = process.argv[1]?.includes('migrate');
if (isCli) {
  runMigrations()
    .then(() => db.close())
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
