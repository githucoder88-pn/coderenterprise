/**
 * Analytics & Billing Platform — Core Types
 */

import { z } from 'zod';
import type { Timestamps } from '../types/index.js';
import type { ProviderName } from '../modules/providers/types.js';

// ─── Usage Tracking ──────────────────────────────────────────────────────────

export interface UsageRecord extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly conversationId: string | null;
  readonly messageId: string | null;
  readonly model: string;
  readonly provider: ProviderName;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly cachedTokens: number;
  readonly reasoningTokens: number;
  readonly estimatedCost: number;
  readonly currency: string;
  readonly requestType: 'completion' | 'embedding' | 'image' | 'audio';
  readonly latencyMs: number;
  readonly status: 'success' | 'error' | 'timeout' | 'cancelled';
  readonly metadata: Record<string, unknown>;
}

export interface UsageAggregate {
  readonly period: string; // '2024-01-15' or '2024-01' or '2024'
  readonly organizationId: string;
  readonly totalRequests: number;
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly byModel: Record<string, { requests: number; tokens: number; cost: number }>;
  readonly byProvider: Record<string, { requests: number; tokens: number; cost: number }>;
  readonly byUser: Record<string, { requests: number; tokens: number; cost: number }>;
  readonly byRequestType: Record<string, { requests: number; tokens: number; cost: number }>;
  readonly errorRate: number;
  readonly avgLatencyMs: number;
  readonly p50LatencyMs: number;
  readonly p95LatencyMs: number;
  readonly p99LatencyMs: number;
}

export interface UsageSummary {
  readonly organizationId: string;
  readonly currentPeriod: UsageAggregate;
  readonly previousPeriod: UsageAggregate | null;
  readonly trend: {
    readonly requestsDelta: number;
    readonly tokensDelta: number;
    readonly costDelta: number;
  };
  readonly topModels: readonly { model: string; requests: number; tokens: number; cost: number }[];
  readonly topUsers: readonly { userId: string; requests: number; tokens: number; cost: number }[];
  readonly dailyBreakdown: readonly { date: string; requests: number; tokens: number; cost: number }[];
}

// ─── Request Tracking ────────────────────────────────────────────────────────

export interface RequestRecord extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly method: string;
  readonly path: string;
  readonly statusCode: number;
  readonly durationMs: number;
  readonly requestSize: number;
  readonly responseSize: number;
  readonly ip: string;
  readonly userAgent: string;
  readonly provider: ProviderName | null;
  readonly model: string | null;
  readonly metadata: Record<string, unknown>;
}

// ─── Model Statistics ────────────────────────────────────────────────────────

export interface ModelStats {
  readonly model: string;
  readonly provider: ProviderName;
  readonly totalRequests: number;
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly avgLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly errorRate: number;
  readonly successRate: number;
  readonly avgTokensPerRequest: number;
  readonly lastUsedAt: Date;
  readonly period: string;
}

// ─── Quota ───────────────────────────────────────────────────────────────────

export interface Quota extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly metric: 'requests' | 'tokens' | 'cost' | 'storage' | 'members' | 'conversations';
  readonly limit: number;
  readonly used: number;
  readonly period: 'daily' | 'monthly' | 'yearly' | 'total';
  readonly resetAt: Date;
  readonly overage: number;
  readonly hardLimit: boolean;
}

export interface QuotaCheckResult {
  readonly allowed: boolean;
  readonly quota: Quota;
  readonly remaining: number;
  readonly percentUsed: number;
  readonly willResetAt: Date;
}

// ─── Billing Plan ────────────────────────────────────────────────────────────

export interface BillingPlan extends Timestamps {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly price: number;
  readonly currency: string;
  readonly interval: 'month' | 'year';
  readonly features: readonly string[];
  readonly quotas: readonly {
    readonly metric: Quota['metric'];
    readonly limit: number;
    readonly period: Quota['period'];
    readonly hardLimit: boolean;
  }[];
  readonly modelAccess: readonly string[]; // model IDs or '*' for all
  readonly metadata: Record<string, unknown>;
}

// ─── Subscription ────────────────────────────────────────────────────────────

export interface Subscription extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly planId: string;
  readonly status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';
  readonly currentPeriodStart: Date;
  readonly currentPeriodEnd: Date;
  readonly cancelAt: Date | null;
  readonly canceledAt: Date | null;
  readonly trialEnd: Date | null;
  readonly providerSubscriptionId: string | null;
  readonly metadata: Record<string, unknown>;
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export interface Invoice extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly subscriptionId: string | null;
  readonly number: string;
  readonly status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  readonly amount: number;
  readonly tax: number;
  readonly total: number;
  readonly currency: string;
  readonly lineItems: readonly InvoiceLineItem[];
  readonly dueDate: Date;
  readonly paidAt: Date | null;
  readonly pdfUrl: string | null;
  readonly paymentMethodId: string | null;
  readonly metadata: Record<string, unknown>;
}

export interface InvoiceLineItem {
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly amount: number;
  readonly period: { start: Date; end: Date } | null;
  readonly metadata: Record<string, unknown>;
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

export interface BillingWebhook extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly event: string;
  readonly payload: Record<string, unknown>;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
  readonly attempts: number;
  readonly lastError: string | null;
  readonly processedAt: Date | null;
}

// ─── Cost Estimation ─────────────────────────────────────────────────────────

export interface CostEstimate {
  readonly model: string;
  readonly provider: ProviderName;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly estimatedCost: number;
  readonly currency: string;
  readonly breakdown: {
    readonly inputCost: number;
    readonly outputCost: number;
    readonly cachedDiscount: number;
  };
}

export interface PricingTable {
  readonly model: string;
  readonly provider: ProviderName;
  readonly inputPerMillion: number;
  readonly outputPerMillion: number;
  readonly cachedInputPerMillion: number;
  readonly currency: string;
  readonly effectiveFrom: Date;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const TrackUsageSchema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
  model: z.string().min(1),
  provider: z.string().min(1),
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  cachedTokens: z.number().int().min(0).default(0),
  reasoningTokens: z.number().int().min(0).default(0),
  requestType: z.enum(['completion', 'embedding', 'image', 'audio']).default('completion'),
  latencyMs: z.number().min(0),
  status: z.enum(['success', 'error', 'timeout', 'cancelled']).default('success'),
  metadata: z.record(z.unknown()).optional(),
});

export const SetQuotaSchema = z.object({
  organizationId: z.string().min(1),
  metric: z.enum(['requests', 'tokens', 'cost', 'storage', 'members', 'conversations']),
  limit: z.number().int().min(0),
  period: z.enum(['daily', 'monthly', 'yearly', 'total']).default('monthly'),
  hardLimit: z.boolean().default(false),
});

export const CreateSubscriptionSchema = z.object({
  organizationId: z.string().min(1),
  planId: z.string().min(1),
  paymentMethodId: z.string().optional(),
  trialDays: z.number().int().min(0).max(90).optional(),
});
