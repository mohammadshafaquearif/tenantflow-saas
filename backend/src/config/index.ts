import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Vercel Postgres / Neon injects these automatically when you add Storage:
 * - POSTGRES_URL              → pooled runtime connection (use this in serverless)
 * - POSTGRES_URL_NON_POOLING  → direct connection (use for migrations / DDL)
 * - POSTGRES_PRISMA_URL       → Prisma-compatible pooled URL (fallback)
 */
function resolveRuntimeDatabaseUrl(): string {
  return (
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    'postgresql://tenantflow:tenantflow_secret@localhost:5432/tenantflow'
  );
}

function resolveMigrateDatabaseUrl(): string {
  return (
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL ??
    'postgresql://tenantflow:tenantflow_secret@localhost:5432/tenantflow'
  );
}

function resolveCorsOrigins(): string[] {
  const fromEnv = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const vercelOrigins: string[] = [];
  if (process.env.VERCEL_URL) {
    vercelOrigins.push(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.VERCEL_BRANCH_URL) {
    vercelOrigins.push(`https://${process.env.VERCEL_BRANCH_URL}`);
  }

  return [...new Set([...fromEnv, ...vercelOrigins])];
}

const isProduction = process.env.NODE_ENV === 'production';
const isVercel = Boolean(process.env.VERCEL);

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  isVercel,
  isServerless: isVercel || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined,
  databaseUrl: resolveRuntimeDatabaseUrl(),
  migrateDatabaseUrl: resolveMigrateDatabaseUrl(),
  jwt: {
    secret: isProduction ? requireEnv('JWT_SECRET') : (process.env.JWT_SECRET ?? 'dev-only-secret-change-in-production'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  },
  corsOrigins: resolveCorsOrigins(),
  isProduction,
} as const;
