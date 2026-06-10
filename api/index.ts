import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Express } from 'express';

let app: Express | undefined;
let initError: Error | undefined;
let ready: Promise<void> | undefined;

async function ensureReady(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const { validateDatabaseConfig } = await import('../backend/dist/config/index.js');
      const { config } = await import('../backend/dist/config/index.js');
      const warnings = validateDatabaseConfig(config.databaseUrl, {
        isVercel: config.isVercel,
        isProduction: config.isProduction,
      });
      warnings.forEach((w) => console.warn('[tenantflow]', w));

      const { runMigrations } = await import('../backend/dist/database/migrate.js');
      await runMigrations();
    })().catch((err) => {
      ready = undefined;
      throw err;
    });
  }
  return ready;
}

async function getApp(): Promise<Express> {
  if (initError) throw initError;
  if (!app) {
    try {
      await ensureReady();
      const { createApp } = await import('../backend/dist/app.js');
      app = createApp();
    } catch (err) {
      initError = err instanceof Error ? err : new Error(String(err));
      console.error('[tenantflow] Failed to load app:', initError);
      throw initError;
    }
  }
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const application = await getApp();
    return application(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[tenantflow] Handler error:', err);
    return res.status(500).json({
      error: 'Server initialization failed',
      message,
      hints: [
        'Set JWT_SECRET in Vercel Environment Variables',
        'Connect Postgres (Storage) with prefix POSTGRES → creates POSTGRES_URL',
        'Redeploy after adding env vars',
      ],
    });
  }
}
