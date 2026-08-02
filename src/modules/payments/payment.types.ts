/**
 * Payment Integration Types
 */

import { z } from 'zod';
import type { Timestamps } from '../../types/index.js';

export const CreatePaymentIntentSchema = z.object({
  organizationId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ProcessRefundSchema = z.object({
  paymentIntentId: z.string().min(1),
  amount: z.number().positive().optional(),
  reason: z.string().max(500).optional(),
});

export type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentSchema>;
export type ProcessRefundInput = z.infer<typeof ProcessRefundSchema>;

export interface PaymentIntent extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
  readonly description: string;
  readonly providerPaymentId: string | null;
  readonly failureReason: string | null;
  readonly metadata: Record<string, unknown>;
}

export interface PaymentMethod extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly type: 'card' | 'bank_account';
  readonly last4: string;
  readonly brand: string;
  readonly expiryMonth: number;
  readonly expiryYear: number;
  readonly isDefault: boolean;
  readonly providerMethodId: string;
}

export interface Invoice extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  readonly lineItems: readonly {
    readonly description: string;
    readonly quantity: number;
    readonly unitPrice: number;
    readonly total: number;
  }[];
  readonly dueDate: Date;
  readonly paidAt: Date | null;
  readonly pdfUrl: string | null;
}
