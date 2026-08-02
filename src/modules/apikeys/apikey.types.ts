/**
 * API Key Module Types
 */

import { z } from 'zod';
import type { Timestamps } from '../../types/index.js';

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  organizationId: z.string().min(1),
  permissions: z.array(z.string()).default([]),
  expiresInDays: z.number().int().min(1).max(365).optional(),
  rateLimit: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;

export interface ApiKey extends Timestamps {
  readonly id: string;
  readonly name: string;
  readonly keyPrefix: string;
  readonly hashedKey: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly permissions: readonly string[];
  readonly status: 'active' | 'revoked' | 'expired';
  readonly lastUsedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly rateLimit: number | null;
  readonly metadata: Record<string, unknown>;
}

export interface CreateApiKeyResult {
  readonly apiKey: ApiKey;
  readonly rawKey: string;
}
