/**
 * User Module Types
 */

import { z } from 'zod';
import type { Timestamps } from '../../types/index.js';

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(100).optional(),
  organizationId: z.string().min(1).optional(),
  role: z.enum(['owner', 'admin', 'member', 'viewer', 'service']).default('member'),
});

export const UpdateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  photoURL: z.string().url().optional(),
  role: z.enum(['owner', 'admin', 'member', 'viewer', 'service']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UserQuerySchema = z.object({
  email: z.string().email().optional(),
  organizationId: z.string().optional(),
  role: z.string().optional(),
  search: z.string().optional(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;

export interface User extends Timestamps {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly photoURL: string | null;
  readonly organizationId: string;
  readonly role: string;
  readonly status: 'active' | 'suspended' | 'deleted';
  readonly metadata: Record<string, unknown>;
  readonly lastLoginAt: Date | null;
  readonly emailVerified: boolean;
}
