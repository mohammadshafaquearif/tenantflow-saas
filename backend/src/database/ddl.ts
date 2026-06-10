import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
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
    connectionTimeoutMillis: 15_000,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
}

/** Single direct-connection session — required so SET search_path persists across statements */
export async function withDdlClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = createDdlPool();
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
    await pool.end();
  }
}

export async function executeDdl<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  return withDdlClient(async (client) => {
    const result: QueryResult<T> = await client.query<T>(sql, params);
    return result.rows;
  });
}
