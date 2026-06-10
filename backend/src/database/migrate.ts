import { db } from './connection-manager.js';
import { TenantConnectionManager } from './connection-manager.js';
import { executeDdl } from './ddl.js';
import { provisionTenantSchema } from './tenant-schema.js';

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

export async function runMigrations(): Promise<void> {
  await executeDdl('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await executeDdl(PUBLIC_MIGRATIONS);

  const rows = await executeDdl<{ schema_name: string }>(
    'SELECT schema_name FROM tenants WHERE is_active = true',
  );

  for (const { schema_name } of rows) {
    TenantConnectionManager.assertValidSchemaName(schema_name);
    await provisionTenantSchema(schema_name);
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
