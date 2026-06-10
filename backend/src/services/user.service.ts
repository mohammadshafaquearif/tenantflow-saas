import { db } from '../database/connection-manager.js';
import type { Role, User } from '../types/index.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import { hashPassword } from './auth.service.js';

export type SafeUser = Omit<User, 'password_hash'> & { tenant_id: string };

export async function listUsers(schemaName: string, tenantId: string): Promise<SafeUser[]> {
  return db.withTenant(schemaName, async (client) => {
    const { rows } = await client.query<Omit<User, 'password_hash'>>(
      `SELECT id, email, full_name, role, is_active, created_at, updated_at FROM users ORDER BY created_at`,
    );
    return rows.map((u) => ({ ...u, tenant_id: tenantId }));
  });
}

export async function createUser(
  schemaName: string,
  tenantId: string,
  input: { email: string; password: string; fullName: string; role: Role },
): Promise<SafeUser> {
  const passwordHash = await hashPassword(input.password);

  try {
    return await db.withTenant(schemaName, async (client) => {
      const { rows } = await client.query<Omit<User, 'password_hash'>>(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, role, is_active, created_at, updated_at`,
        [input.email.toLowerCase(), passwordHash, input.fullName, input.role],
      );
      return { ...rows[0], tenant_id: tenantId };
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      throw new ConflictError('User with this email already exists');
    }
    throw err;
  }
}

export async function updateUserRole(
  schemaName: string,
  tenantId: string,
  userId: string,
  role: Role,
): Promise<SafeUser> {
  return db.withTenant(schemaName, async (client) => {
    const { rows } = await client.query<Omit<User, 'password_hash'>>(
      `UPDATE users SET role = $1, updated_at = NOW()
       WHERE id = $2 AND is_active = true
       RETURNING id, email, full_name, role, is_active, created_at, updated_at`,
      [role, userId],
    );
    if (!rows[0]) throw new NotFoundError('User not found');
    return { ...rows[0], tenant_id: tenantId };
  });
}
