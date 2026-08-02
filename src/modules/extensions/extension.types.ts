/**
 * Extension Service Types
 */

import { z } from 'zod';
import type { Timestamps } from '../../types/index.js';

export const CreateExtensionSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  organizationId: z.string().min(1),
  type: z.enum(['plugin', 'integration', 'connector', 'widget']),
  config: z.record(z.unknown()).optional(),
  permissions: z.array(z.string()).default([]),
  endpoints: z.array(z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    path: z.string(),
    description: z.string().optional(),
  })).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateExtensionSchema = z.object({
  description: z.string().max(1000).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  config: z.record(z.unknown()).optional(),
  permissions: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateExtensionInput = z.infer<typeof CreateExtensionSchema>;
export type UpdateExtensionInput = z.infer<typeof UpdateExtensionSchema>;

export interface Extension extends Timestamps {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly version: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly type: 'plugin' | 'integration' | 'connector' | 'widget';
  readonly status: 'active' | 'inactive' | 'pending_review' | 'rejected';
  readonly config: Record<string, unknown>;
  readonly permissions: readonly string[];
  readonly installCount: number;
  readonly metadata: Record<string, unknown>;
}
