/**
 * Prompt Storage Types
 */

import { z } from 'zod';
import type { Timestamps } from '../../types/index.js';

export const CreatePromptSchema = z.object({
  name: z.string().min(1).max(200),
  content: z.string().min(1).max(100_000),
  organizationId: z.string().min(1),
  workspaceId: z.string().optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  variables: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    required: z.boolean().default(false),
    defaultValue: z.string().optional(),
  })).optional(),
  isPublic: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdatePromptSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(100_000).optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  variables: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    required: z.boolean().default(false),
    defaultValue: z.string().optional(),
  })).optional(),
  isPublic: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreatePromptInput = z.infer<typeof CreatePromptSchema>;
export type UpdatePromptInput = z.infer<typeof UpdatePromptSchema>;

export interface Prompt extends Timestamps {
  readonly id: string;
  readonly name: string;
  readonly content: string;
  readonly organizationId: string;
  readonly workspaceId: string | null;
  readonly userId: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly variables: readonly {
    readonly name: string;
    readonly description?: string;
    readonly required: boolean;
    readonly defaultValue?: string;
  }[];
  readonly isPublic: boolean;
  readonly version: number;
  readonly usageCount: number;
  readonly metadata: Record<string, unknown>;
}
