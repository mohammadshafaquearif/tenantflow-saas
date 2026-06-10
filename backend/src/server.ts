import { createApp } from './app.js';
import { config } from './config/index.js';
import { runMigrations } from './database/migrate.js';
import { db } from './database/connection-manager.js';

async function bootstrap() {
  await runMigrations();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`TenantFlow API running on port ${config.port} [${config.nodeEnv}]`);
  });

  const shutdown = async (signal: string) => {
    console.log(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
