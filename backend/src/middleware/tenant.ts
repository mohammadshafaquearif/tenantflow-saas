import type { NextFunction, Request, Response } from 'express';
import { db } from '../database/connection-manager.js';
import { findTenantBySlug } from '../services/auth.service.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

/**
 * Resolves tenant from X-Tenant-ID (UUID) or X-Tenant-Slug header.
 * Used on public routes (login/register) before JWT is available.
 */
export async function resolveTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    const tenantSlug = req.headers['x-tenant-slug'] as string | undefined;

    if (tenantId) {
      const { rows } = await db.queryMaster<{ id: string; schema_name: string; slug: string }>(
        'SELECT id, schema_name, slug FROM tenants WHERE id = $1 AND is_active = true',
        [tenantId],
      );
      if (!rows[0]) {
        next(new NotFoundError('Tenant not found'));
        return;
      }
      res.locals.tenantId = rows[0].id;
      res.locals.schemaName = rows[0].schema_name;
      res.locals.tenantSlug = rows[0].slug;
    } else if (tenantSlug) {
      const tenant = await findTenantBySlug(tenantSlug);
      if (!tenant) {
        next(new NotFoundError('Tenant not found'));
        return;
      }
      res.locals.tenantId = tenant.id;
      res.locals.schemaName = tenant.schema_name;
      res.locals.tenantSlug = tenant.slug;
    } else {
      next(new BadRequestError('X-Tenant-ID or X-Tenant-Slug header required'));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
