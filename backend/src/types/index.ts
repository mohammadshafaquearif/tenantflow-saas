export const ROLES = ['TENANT_ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_HIERARCHY: Record<Role, number> = {
  TENANT_ADMIN: 4,
  MANAGER: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  schema_name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface JwtPayload {
  sub: string;
  tenantId: string;
  tenantSlug: string;
  email: string;
  role: Role;
  schemaName: string;
}

export interface AuthenticatedRequest {
  user: JwtPayload;
  tenantId: string;
  schemaName: string;
}
