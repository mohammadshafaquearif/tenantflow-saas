import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.routes.js';
import { projectRouter } from './routes/project.routes.js';
import { taskRouter } from './routes/task.routes.js';
import { userRouter } from './routes/user.routes.js';
import { db } from './database/connection-manager.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: config.isProduction ? 200 : 1000,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get('/health', async (_req, res) => {
    const dbHealthy = await db.healthCheck();
    res.status(dbHealthy ? 200 : 503).json({
      status: dbHealthy ? 'ok' : 'degraded',
      service: 'tenantflow-api',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/ready', async (_req, res) => {
    const dbHealthy = await db.healthCheck();
    if (!dbHealthy) {
      res.status(503).json({ ready: false });
      return;
    }
    res.json({ ready: true });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/projects', projectRouter);
  app.use('/api/v1/projects/:projectId/tasks', taskRouter);

  app.use(errorHandler);

  return app;
}
