import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config, getJwtSecret } from '../config/index.js';
import { db } from '../database/connection-manager.js';
import { TenantConnectionManager } from '../database/connection-manager.js';
import { dropTenantSchema, provisionTenantSchema } from '../database/tenant-schema.js';
import type { JwtPayload, Role, Tenant, User } from '../types/index.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export async function findTenantBySlug(slug: string): Promise<Tenant | null> {
  const { rows } = await db.queryMaster<Tenant>(
    'SELECT * FROM tenants WHERE slug = $1 AND is_active = true',
    [slug],
  );
  return rows[0] ?? null;
}

export async function login(
  tenantSlug: string,
  email: string,
  password: string,
): Promise<{ token: string; user: Omit<User, 'password_hash'> }> {
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    throw new UnauthorizedError('Invalid tenant or credentials');
  }

  const user = await db.withTenant<User>(tenant.schema_name, async (client) => {
    const { rows } = await client.query<User>(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()],
    );
    return rows[0] ?? null;
  });

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw new UnauthorizedError('Invalid tenant or credentials');
  }

  const payload: JwtPayload = {
    sub: user.id,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    email: user.email,
    role: user.role,
    schemaName: tenant.schema_name,
  };

  const { password_hash: _, ...safeUser } = { ...user, tenant_id: tenant.id };
  return { token: signToken(payload), user: safeUser };
}

export async function registerTenantAdmin(input: {
  tenantName: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
}): Promise<{ tenant: Tenant; token: string; user: Omit<User, 'password_hash'> }> {
  const { toSlug, toSchemaName } = await import('../utils/slug.js');
  const slug = toSlug(input.tenantName);
  const schemaName = toSchemaName(slug);

  if (!slug) {
    throw new BadRequestError('Invalid tenant name');
  }

  const existing = await findTenantBySlug(slug);
  if (existing) {
    throw new BadRequestError('Tenant already exists with this name');
  }

  const passwordHash = await hashPassword(input.adminPassword);

  TenantConnectionManager.assertValidSchemaName(schemaName);

  const tenant = await db.queryMaster<Tenant>(
    `INSERT INTO tenants (name, slug, schema_name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.tenantName, slug, schemaName],
  ).then((r) => r.rows[0]);

  let user: User;
  try {
    await provisionTenantSchema(schemaName);

    user = await db.withTenant<User>(schemaName, async (client) => {
      const { rows } = await client.query<User>(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, 'TENANT_ADMIN')
         RETURNING *`,
        [input.adminEmail.toLowerCase(), passwordHash, input.adminFullName],
      );
      return rows[0];
    });
  } catch (error) {
    await db.queryMaster('DELETE FROM tenants WHERE id = $1', [tenant.id]).catch(() => undefined);
    await dropTenantSchema(schemaName).catch(() => undefined);
    throw error;
  }

  const payload: JwtPayload = {
    sub: user.id,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    email: user.email,
    role: user.role,
    schemaName: tenant.schema_name,
  };

  const { password_hash: _, ...safeUser } = user;
  return { tenant, token: signToken(payload), user: safeUser };
}

export function hasMinimumRole(userRole: Role, requiredRole: Role): boolean {
  const hierarchy: Record<Role, number> = {
    TENANT_ADMIN: 4,
    MANAGER: 3,
    MEMBER: 2,
    VIEWER: 1,
  };
  return hierarchy[userRole] >= hierarchy[requiredRole];
}
