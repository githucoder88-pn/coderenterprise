/**
 * Workspace Module Types
 */

import { z } from 'zod';
import type { Timestamps } from '../../types/index.js';

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  organizationId: z.string().min(1),
  description: z.string().max(500).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const AddWorkspaceMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).default('member'),
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type AddWorkspaceMemberInput = z.infer<typeof AddWorkspaceMemberSchema>;

export interface Workspace extends Timestamps {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly organizationId: string;
  readonly description: string;
  readonly status: 'active' | 'archived' | 'deleted';
  readonly memberCount: number;
  readonly settings: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
}

export interface WorkspaceMember extends Timestamps {
  readonly id: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: string;
  readonly joinedAt: Date;
}
