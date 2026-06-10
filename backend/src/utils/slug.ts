export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function toSchemaName(slug: string): string {
  const sanitized = slug.replace(/-/g, '_').replace(/[^a-z0-9_]/g, '');
  return `tenant_${sanitized}`;
}
