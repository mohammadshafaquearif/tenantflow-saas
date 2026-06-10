import { describe, expect, it } from 'vitest';
import { toSchemaName, toSlug } from '../../src/utils/slug.js';

describe('slug utilities', () => {
  it('converts company name to URL-safe slug', () => {
    expect(toSlug('Acme Corp')).toBe('acme-corp');
    expect(toSlug('  Hello   World!  ')).toBe('hello-world');
  });

  it('generates valid PostgreSQL schema names', () => {
    expect(toSchemaName('acme-corp')).toBe('tenant_acme_corp');
    expect(toSchemaName('test')).toBe('tenant_test');
  });
});
