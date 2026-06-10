export type Role = 'TENANT_ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  tenantId: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  token: string;
  user: User;
  tenant: Tenant;
}
