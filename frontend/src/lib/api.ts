import type { AuthSession, Project, Task, TaskPriority, TaskStatus } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth?: { token: string; tenantId: string },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (auth) {
    headers.Authorization = `Bearer ${auth.token}`;
    headers['X-Tenant-ID'] = auth.tenantId;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string; message?: string };
    const msg = body.error ?? body.message ?? `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  register(input: {
    tenantName: string;
    adminEmail: string;
    adminPassword: string;
    adminFullName: string;
  }) {
    return request<{
      tenant: { id: string; name: string; slug: string };
      token: string;
      user: { id: string; email: string; full_name: string; role: string };
    }>(
      '/api/v1/auth/register',
      { method: 'POST', body: JSON.stringify(input) },
    );
  },

  login(tenantSlug: string, email: string, password: string) {
    return request<{ token: string; user: { id: string; email: string; fullName: string; role: string; tenantId: string } }>(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: { 'X-Tenant-Slug': tenantSlug },
        body: JSON.stringify({ email, password }),
      },
    );
  },

  getProjects(auth: AuthSession) {
    return request<{ projects: Project[] }>(
      '/api/v1/projects',
      {},
      { token: auth.token, tenantId: auth.tenant.id },
    );
  },

  createProject(auth: AuthSession, name: string, description?: string) {
    return request<{ project: Project }>(
      '/api/v1/projects',
      { method: 'POST', body: JSON.stringify({ name, description }) },
      { token: auth.token, tenantId: auth.tenant.id },
    );
  },

  deleteProject(auth: AuthSession, projectId: string) {
    return request<void>(
      `/api/v1/projects/${projectId}`,
      { method: 'DELETE' },
      { token: auth.token, tenantId: auth.tenant.id },
    );
  },

  getTasks(auth: AuthSession, projectId: string) {
    return request<{ tasks: Task[] }>(
      `/api/v1/projects/${projectId}/tasks`,
      {},
      { token: auth.token, tenantId: auth.tenant.id },
    );
  },

  createTask(
    auth: AuthSession,
    projectId: string,
    input: { title: string; description?: string; priority?: TaskPriority; status?: TaskStatus },
  ) {
    return request<{ task: Task }>(
      `/api/v1/projects/${projectId}/tasks`,
      { method: 'POST', body: JSON.stringify(input) },
      { token: auth.token, tenantId: auth.tenant.id },
    );
  },

  updateTask(
    auth: AuthSession,
    projectId: string,
    taskId: string,
    updates: Partial<{ title: string; status: TaskStatus; priority: TaskPriority }>,
  ) {
    return request<{ task: Task }>(
      `/api/v1/projects/${projectId}/tasks/${taskId}`,
      { method: 'PATCH', body: JSON.stringify(updates) },
      { token: auth.token, tenantId: auth.tenant.id },
    );
  },

  deleteTask(auth: AuthSession, projectId: string, taskId: string) {
    return request<void>(
      `/api/v1/projects/${projectId}/tasks/${taskId}`,
      { method: 'DELETE' },
      { token: auth.token, tenantId: auth.tenant.id },
    );
  },
};
