import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
} from '../services/project.service.js';
import { createProjectSchema } from '../validators/schemas.js';

export const projectRouter = Router({ mergeParams: true });

projectRouter.use(authenticate);

projectRouter.get('/', requireRole('VIEWER', 'MEMBER', 'MANAGER', 'TENANT_ADMIN'), async (_req, res, next) => {
  try {
    const projects = await listProjects(res.locals.schemaName);
    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

projectRouter.post('/', requireRole('MEMBER', 'MANAGER', 'TENANT_ADMIN'), async (req, res, next) => {
  try {
    const body = createProjectSchema.parse(req.body);
    const project = await createProject(res.locals.schemaName, {
      name: body.name,
      description: body.description,
      createdBy: res.locals.user.sub,
    });
    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

projectRouter.get('/:projectId', requireRole('VIEWER', 'MEMBER', 'MANAGER', 'TENANT_ADMIN'), async (req, res, next) => {
  try {
    const project = await getProject(res.locals.schemaName, String(req.params.projectId));
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

projectRouter.delete('/:projectId', requireRole('MANAGER', 'TENANT_ADMIN'), async (req, res, next) => {
  try {
    await deleteProject(res.locals.schemaName, String(req.params.projectId));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
