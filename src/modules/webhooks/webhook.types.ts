/**
 * Webhook Module Types
 */

import { z } from 'zod';
import type { Timestamps } from '../../types/index.js';

export const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1).max(50),
  organizationId: z.string().min(1),
  secret: z.string().min(16).optional(),
  active: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string().min(1)).min(1).max(50).optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;

export interface Webhook extends Timestamps {
  readonly id: string;
  readonly url: string;
  readonly events: readonly string[];
  readonly organizationId: string;
  readonly userId: string;
  readonly secret: string;
  readonly active: boolean;
  readonly failureCount: number;
  readonly lastTriggeredAt: Date | null;
  readonly lastResponseStatus: number | null;
  readonly metadata: Record<string, unknown>;
}

export interface WebhookDelivery extends Timestamps {
  readonly id: string;
  readonly webhookId: string;
  readonly event: string;
  readonly payload: Record<string, unknown>;
  readonly responseStatus: number | null;
  readonly responseBody: string | null;
  readonly durationMs: number;
  readonly attempt: number;
  readonly status: 'pending' | 'delivered' | 'failed' | 'retrying';
  readonly error: string | null;
}

export interface WebhookEvent {
  readonly event: string;
  readonly data: Record<string, unknown>;
  readonly timestamp: Date;
  readonly organizationId: string;
}
