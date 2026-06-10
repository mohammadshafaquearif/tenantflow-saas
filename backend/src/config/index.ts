import 'dotenv/config';

/**
 * Vercel Postgres / Prisma Postgres injects connection strings automatically.
 * Supported env var names (first match wins):
 * - POSTGRES_URL, POSTGRES_PRISMA_URL, PRISMA_DATABASE_URL, DATABASE_URL
 */
function resolveRuntimeDatabaseUrl(): string {
  return (
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.PRISMA_DATABASE_URL ??
    process.env.DATABASE_URL ??
    'postgresql://tenantflow:tenantflow_secret@localhost:5432/tenantflow'
  );
}

/** Direct connection for DDL — never use pooled URL when non-pooling is available */
function resolveMigrateDatabaseUrl(): string {
  return (
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_DIRECT_URL ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.PRISMA_DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL ??
    process.env.PRISMA_DATABASE_URL ??
    process.env.DATABASE_URL ??
    'postgresql://tenantflow:tenantflow_secret@localhost:5432/tenantflow'
  );
}

export function validateDatabaseConfig(
  dbUrl: string,
  opts: { isVercel: boolean; isProduction: boolean },
): string[] {
  const warnings: string[] = [];
  const isRemote = opts.isVercel || opts.isProduction;

  if (isRemote && dbUrl.includes('localhost')) {
    warnings.push('POSTGRES_URL missing — falling back to localhost (API will fail)');
  }

  if (
    isRemote &&
    !process.env.POSTGRES_URL_NON_POOLING &&
    !process.env.POSTGRES_DIRECT_URL &&
    !process.env.DATABASE_URL_UNPOOLED
  ) {
    warnings.push(
      'POSTGRES_URL_NON_POOLING not set — DDL uses pooled URL (may fail on register/migrate)',
    );
  }

  if (isRemote && !process.env.JWT_SECRET) {
    warnings.push('JWT_SECRET missing — auth routes will fail');
  }

  return warnings;
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

/** Lazy — don't crash serverless cold start; fail only on auth routes */
export function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (isVercel || isProduction) {
    throw new Error(
      'Missing JWT_SECRET. Add it in Vercel → Project Settings → Environment Variables',
    );
  }
  return 'dev-only-secret-change-in-production';
}

const databaseUrl = resolveRuntimeDatabaseUrl();
const migrateDatabaseUrl = resolveMigrateDatabaseUrl();

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  isVercel,
  isServerless: isVercel || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined,
  databaseUrl,
  migrateDatabaseUrl,
  usesDirectDdlConnection: migrateDatabaseUrl !== databaseUrl || Boolean(process.env.POSTGRES_URL_NON_POOLING),
  jwt: {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  },
  corsOrigins: resolveCorsOrigins(),
  isProduction,
} as const;

