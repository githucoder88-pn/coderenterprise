/**
 * Organization Module Types
 */

import { z } from 'zod';
import type { Timestamps } from '../../types/index.js';

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).default('free'),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).optional(),
  metadata: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const AddMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).default('member'),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;
export type AddMemberInput = z.infer<typeof AddMemberSchema>;

export interface Organization extends Timestamps {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly plan: string;
  readonly ownerId: string;
  readonly memberCount: number;
  readonly status: 'active' | 'suspended' | 'deleted';
  readonly metadata: Record<string, unknown>;
  readonly settings: Record<string, unknown>;
}

export interface OrganizationMember extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly role: string;
  readonly joinedAt: Date;
}
