import { Pool, type QueryResultRow } from 'pg';
import { config } from '../config/index.js';

/** Direct (non-pooled) connection for DDL: CREATE SCHEMA, CREATE EXTENSION, etc. */
function createDdlPool(): Pool {
  const useSsl =
    config.isServerless ||
    config.migrateDatabaseUrl.includes('sslmode=require') ||
    config.migrateDatabaseUrl.includes('neon.tech') ||
    config.migrateDatabaseUrl.includes('prisma.io') ||
    config.isProduction;

  return new Pool({
    connectionString: config.migrateDatabaseUrl,
    max: 1,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
}

export async function executeDdl<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const pool = createDdlPool();
  try {
    const { rows } = await pool.query<T>(sql, params);
    return rows;
  } finally {
    await pool.end();
  }
}
