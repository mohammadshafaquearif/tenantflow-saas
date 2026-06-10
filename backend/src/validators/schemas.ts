import { z } from 'zod';
import { ROLES, TASK_PRIORITIES, TASK_STATUSES } from '../types/index.js';

export const registerTenantSchema = z.object({
  tenantName: z.string().min(2).max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(128),
  adminFullName: z.string().min(2).max(255),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(255),
  role: z.enum(ROLES).default('MEMBER'),
});

export const updateRoleSchema = z.object({
  role: z.enum(ROLES),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: z.string().uuid().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});
