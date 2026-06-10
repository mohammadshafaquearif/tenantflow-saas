import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createTask, deleteTask, listTasks, updateTask } from '../services/task.service.js';
import { createTaskSchema, updateTaskSchema } from '../validators/schemas.js';

export const taskRouter = Router({ mergeParams: true });

taskRouter.use(authenticate);

taskRouter.get('/', requireRole('VIEWER', 'MEMBER', 'MANAGER', 'TENANT_ADMIN'), async (req, res, next) => {
  try {
    const tasks = await listTasks(res.locals.schemaName, String(req.params.projectId));
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

taskRouter.post('/', requireRole('MEMBER', 'MANAGER', 'TENANT_ADMIN'), async (req, res, next) => {
  try {
    const body = createTaskSchema.parse(req.body);
    const task = await createTask(res.locals.schemaName, {
      projectId: String(req.params.projectId),
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      assigneeId: body.assigneeId,
      createdBy: res.locals.user.sub,
    });
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

taskRouter.patch('/:taskId', requireRole('MEMBER', 'MANAGER', 'TENANT_ADMIN'), async (req, res, next) => {
  try {
    const body = updateTaskSchema.parse(req.body);
    const task = await updateTask(res.locals.schemaName, String(req.params.taskId), {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      assignee_id: body.assigneeId,
    });
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

taskRouter.delete('/:taskId', requireRole('MANAGER', 'TENANT_ADMIN'), async (req, res, next) => {
  try {
    await deleteTask(res.locals.schemaName, String(req.params.taskId));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
