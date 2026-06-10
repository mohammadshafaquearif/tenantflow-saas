import { describe, expect, it } from 'vitest';
import { hasMinimumRole } from '../../src/services/auth.service.js';

describe('RBAC role hierarchy', () => {
  it('allows higher roles to access lower role permissions', () => {
    expect(hasMinimumRole('TENANT_ADMIN', 'VIEWER')).toBe(true);
    expect(hasMinimumRole('MANAGER', 'MEMBER')).toBe(true);
    expect(hasMinimumRole('MEMBER', 'MEMBER')).toBe(true);
  });

  it('denies lower roles from accessing higher role permissions', () => {
    expect(hasMinimumRole('VIEWER', 'MEMBER')).toBe(false);
    expect(hasMinimumRole('MEMBER', 'TENANT_ADMIN')).toBe(false);
    expect(hasMinimumRole('MANAGER', 'TENANT_ADMIN')).toBe(false);
  });
});
