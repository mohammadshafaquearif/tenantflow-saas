import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createUser, listUsers, updateUserRole } from '../services/user.service.js';
import { createUserSchema, updateRoleSchema } from '../validators/schemas.js';

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get('/', requireRole('TENANT_ADMIN', 'MANAGER'), async (_req, res, next) => {
  try {
    const users = await listUsers(res.locals.schemaName, res.locals.tenantId);
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

userRouter.post('/', requireRole('TENANT_ADMIN'), async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    const user = await createUser(res.locals.schemaName, res.locals.tenantId, {
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      role: body.role,
    });
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

userRouter.patch('/:userId/role', requireRole('TENANT_ADMIN'), async (req, res, next) => {
  try {
    const body = updateRoleSchema.parse(req.body);
    const user = await updateUserRole(
      res.locals.schemaName,
      res.locals.tenantId,
      String(req.params.userId),
      body.role,
    );
    res.json({ user });
  } catch (error) {
    next(error);
  }
});
