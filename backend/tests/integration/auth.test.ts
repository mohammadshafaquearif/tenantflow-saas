import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

vi.mock('../../src/services/auth.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/auth.service.js')>();
  return {
    ...actual,
    registerTenantAdmin: vi.fn().mockResolvedValue({
      tenant: { id: 't-1', name: 'Acme', slug: 'acme', schema_name: 'tenant_acme' },
      token: 'mock-jwt-token',
    }),
    login: vi.fn().mockResolvedValue({
      token: 'mock-jwt-token',
      user: {
        id: 'u-1',
        tenant_id: 't-1',
        email: 'admin@acme.com',
        full_name: 'Admin',
        role: 'TENANT_ADMIN',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    }),
  };
});

vi.mock('../../src/middleware/tenant.js', () => ({
  resolveTenant: (_req: unknown, res: { locals: Record<string, string> }, next: () => void) => {
    res.locals.tenantId = 't-1';
    res.locals.schemaName = 'tenant_acme';
    res.locals.tenantSlug = 'acme';
    next();
  },
}));

describe('Auth API', () => {
  const app = createApp();

  it('registers a new tenant', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        tenantName: 'Acme Corp',
        adminEmail: 'admin@acme.com',
        adminPassword: 'securepass123',
        adminFullName: 'Acme Admin',
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBe('mock-jwt-token');
    expect(res.body.tenant.slug).toBe('acme');
  });

  it('rejects invalid registration payload', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ tenantName: 'A' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('logs in with tenant context', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Tenant-Slug', 'acme')
      .send({ email: 'admin@acme.com', password: 'securepass123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('mock-jwt-token');
    expect(res.body.user.role).toBe('TENANT_ADMIN');
  });
});
