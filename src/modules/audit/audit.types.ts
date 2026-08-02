/**
 * Audit Module Types
 */

import type { Timestamps } from '../../types/index.js';

export interface AuditLog extends Timestamps {
  readonly id: string;
  readonly action: string;
  readonly actorId: string;
  readonly targetId: string;
  readonly targetType: string;
  readonly data: Record<string, unknown>;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly organizationId?: string;
}

export interface AuditLogInput {
  readonly action: string;
  readonly actorId: string;
  readonly targetId: string;
  readonly targetType: string;
  readonly data: Record<string, unknown>;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly organizationId?: string;
}
