import { describe, expect, it } from 'vitest';
import { TenantConnectionManager } from '../../src/database/connection-manager.js';

describe('TenantConnectionManager', () => {
  it('rejects invalid schema names to prevent SQL injection', () => {
    expect(() => TenantConnectionManager.assertValidSchemaName('tenant_acme')).not.toThrow();
    expect(() => TenantConnectionManager.assertValidSchemaName('public')).toThrow();
    expect(() => TenantConnectionManager.assertValidSchemaName('tenant_; DROP TABLE users;--')).toThrow();
    expect(() => TenantConnectionManager.assertValidSchemaName('tenant_acme-corp')).toThrow();
  });
});
