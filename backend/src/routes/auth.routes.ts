import { Router } from 'express';
import { login, registerTenantAdmin } from '../services/auth.service.js';
import { resolveTenant } from '../middleware/tenant.js';
import { loginSchema, registerTenantSchema } from '../validators/schemas.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerTenantSchema.parse(req.body);
    const result = await registerTenantAdmin(body);
    res.status(201).json({
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', resolveTenant, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const tenantSlug = res.locals.tenantSlug as string;
    const result = await login(tenantSlug, body.email, body.password);
    res.json({
      token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.full_name,
        role: result.user.role,
        tenantId: res.locals.tenantId,
      },
    });
  } catch (error) {
    next(error);
  }
});
