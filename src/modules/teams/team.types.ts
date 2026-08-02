/**
 * Team Module Types
 */

import { z } from 'zod';
import type { Timestamps } from '../../types/index.js';

export const CreateTeamSchema = z.object({
  name: z.string().min(1).max(100),
  organizationId: z.string().min(1),
  workspaceId: z.string().min(1),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const AddTeamMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['lead', 'member', 'viewer']).default('member'),
});

export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;
export type AddTeamMemberInput = z.infer<typeof AddTeamMemberSchema>;

export interface Team extends Timestamps {
  readonly id: string;
  readonly name: string;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly description: string;
  readonly status: 'active' | 'archived' | 'deleted';
  readonly memberCount: number;
  readonly metadata: Record<string, unknown>;
}

export interface TeamMember extends Timestamps {
  readonly id: string;
  readonly teamId: string;
  readonly userId: string;
  readonly role: string;
  readonly joinedAt: Date;
}
