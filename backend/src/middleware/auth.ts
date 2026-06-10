import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../types/index.js';
import { hasMinimumRole, verifyToken } from '../services/auth.service.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export interface AuthLocals {
  user: ReturnType<typeof verifyToken>;
  tenantId: string;
  schemaName: string;
}

declare global {
  namespace Express {
    interface Locals extends AuthLocals {}
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing bearer token'));
    return;
  }

  try {
    const token = header.slice(7);
    const payload = verifyToken(token);

    const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
    if (headerTenantId && headerTenantId !== payload.tenantId) {
      next(new ForbiddenError('Tenant ID mismatch — cross-tenant access denied'));
      return;
    }

    res.locals.user = payload;
    res.locals.tenantId = payload.tenantId;
    res.locals.schemaName = payload.schemaName;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const { user } = res.locals;
    if (!user) {
      next(new UnauthorizedError());
      return;
    }

    const minRequired = allowedRoles.reduce<Role>((min, role) => {
      const hierarchy: Record<Role, number> = {
        TENANT_ADMIN: 4,
        MANAGER: 3,
        MEMBER: 2,
        VIEWER: 1,
      };
      return hierarchy[role] < hierarchy[min] ? role : min;
    }, allowedRoles[0]);

    if (!hasMinimumRole(user.role, minRequired)) {
      next(new ForbiddenError(`Requires one of: ${allowedRoles.join(', ')}`));
      return;
    }

    next();
  };
}
