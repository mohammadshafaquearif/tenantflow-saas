import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/index.js';

/**
 * Schema-per-tenant isolation:
 * - `public` schema: tenant registry + platform metadata
 * - `tenant_<slug>` schema: isolated users, projects, tasks per company
 *
 * Every tenant-scoped query runs inside a transaction with
 * `SET LOCAL search_path` so cross-tenant data leakage is prevented at the DB layer.
 */
export class TenantConnectionManager {
  private readonly masterPool: Pool;
  private readonly tenantPools = new Map<string, Pool>();

  constructor() {
    const useSsl =
      config.isServerless ||
      config.databaseUrl.includes('sslmode=require') ||
      config.databaseUrl.includes('neon.tech') ||
      config.databaseUrl.includes('prisma.io') ||
      config.isProduction;

    this.masterPool = new Pool({
      connectionString: config.databaseUrl,
      // Serverless (Vercel): keep pool tiny — Neon/Vercel Postgres handles pooling externally
      max: config.isServerless ? 1 : 20,
      idleTimeoutMillis: config.isServerless ? 5_000 : 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  getMasterPool(): Pool {
    return this.masterPool;
  }

  /** Validate schema name to prevent SQL injection via tenant identifiers */
  static assertValidSchemaName(schemaName: string): void {
    if (!/^tenant_[a-z0-9_]+$/.test(schemaName)) {
      throw new Error(`Invalid tenant schema name: ${schemaName}`);
    }
  }

  async queryMaster<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.masterPool.query<T>(text, params);
  }

  /**
   * Execute a callback within a tenant-isolated transaction.
   * `SET LOCAL search_path` is scoped to the transaction only.
   */
  async withTenant<T>(schemaName: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
    TenantConnectionManager.assertValidSchemaName(schemaName);

    const client = await this.masterPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL search_path TO ${schemaName}, public`);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.masterPool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.masterPool.end();
    await Promise.all([...this.tenantPools.values()].map((pool) => pool.end()));
    this.tenantPools.clear();
  }
}

export const db = new TenantConnectionManager();
