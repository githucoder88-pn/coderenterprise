/**
 * Notification Service Types
 */

import { z } from 'zod';
import type { Timestamps } from '../../types/index.js';

export const SendNotificationSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().optional(),
  type: z.enum(['info', 'warning', 'error', 'success', 'billing', 'security', 'team', 'system']),
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
  actionUrl: z.string().url().optional(),
  channel: z.enum(['in_app', 'email', 'webhook', 'push']).default('in_app'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateNotificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  inApp: z.boolean().optional(),
  push: z.boolean().optional(),
  webhook: z.boolean().optional(),
  types: z.record(z.boolean()).optional(),
});

export type SendNotificationInput = z.infer<typeof SendNotificationSchema>;
export type UpdateNotificationPreferencesInput = z.infer<typeof UpdateNotificationPreferencesSchema>;

export interface Notification extends Timestamps {
  readonly id: string;
  readonly userId: string;
  readonly organizationId: string | null;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly actionUrl: string | null;
  readonly channel: string;
  readonly priority: string;
  readonly read: boolean;
  readonly readAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export interface NotificationPreferences extends Timestamps {
  readonly userId: string;
  readonly email: boolean;
  readonly inApp: boolean;
  readonly push: boolean;
  readonly webhook: boolean;
  readonly types: Record<string, boolean>;
}
