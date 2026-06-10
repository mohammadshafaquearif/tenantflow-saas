import { describe, expect, it } from 'vitest';
import { TenantConnectionManager } from '../../src/database/connection-manager.js';

describe('tenant schema provisioning', () => {
  it('rejects invalid schema names before any DDL runs', async () => {
    const { provisionTenantSchema } = await import('../../src/database/tenant-schema.js');
    await expect(provisionTenantSchema('public')).rejects.toThrow('Invalid tenant schema');
    await expect(provisionTenantSchema('tenant_bad-name')).rejects.toThrow('Invalid tenant schema');
  });

  it('accepts valid tenant schema names', () => {
    expect(() => TenantConnectionManager.assertValidSchemaName('tenant_acme_corp')).not.toThrow();
  });
});
