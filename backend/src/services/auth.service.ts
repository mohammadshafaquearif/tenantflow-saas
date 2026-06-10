import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config, getJwtSecret } from '../config/index.js';
import { db } from '../database/connection-manager.js';
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
}): Promise<{ tenant: Tenant; token: string }> {
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

  const tenant = await db.queryMaster<Tenant>(
    `INSERT INTO tenants (name, slug, schema_name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.tenantName, slug, schemaName],
  ).then((r) => r.rows[0]);

  await db.getMasterPool().query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

  const TENANT_DDL = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL CHECK (role IN ('TENANT_ADMIN', 'MANAGER', 'MEMBER', 'VIEWER')),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'todo',
      priority VARCHAR(50) NOT NULL DEFAULT 'medium',
      assignee_id UUID REFERENCES users(id),
      created_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await db.withTenant(schemaName, async (client) => {
    await client.query(TENANT_DDL);
    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'TENANT_ADMIN')`,
      [input.adminEmail.toLowerCase(), passwordHash, input.adminFullName],
    );
  });

  const { token } = await login(slug, input.adminEmail, input.adminPassword);
  return { tenant, token };
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
