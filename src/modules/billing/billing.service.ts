/**
 * Billing Service
 *
 * Abstraction layer for billing operations.
 * Designed to be provider-agnostic (Stripe, Paddle, etc.).
 */

import { BaseService } from '../../core/base-service.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type { IAnalyticsService } from '../analytics/analytics.service.js';
import {
  DomainEvent,
  ErrorCode,
  type Result,
} from '../../types/index.js';

export interface BillingPlan {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly currency: string;
  readonly interval: 'month' | 'year';
  readonly features: readonly string[];
  readonly limits: Record<string, number>;
}

export interface Subscription {
  readonly id: string;
  readonly organizationId: string;
  readonly planId: string;
  readonly status: 'active' | 'canceled' | 'past_due' | 'trialing';
  readonly currentPeriodStart: Date;
  readonly currentPeriodEnd: Date;
  readonly cancelAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export interface UsageReport {
  readonly organizationId: string;
  readonly metric: string;
  readonly quantity: number;
  readonly timestamp: Date;
}

export interface IBillingService {
  getPlans(): Promise<Result<readonly BillingPlan[]>>;
  getPlan(planId: string): Promise<Result<BillingPlan>>;
  getSubscription(organizationId: string): Promise<Result<Subscription | null>>;
  createCheckoutSession(organizationId: string, planId: string): Promise<Result<{ url: string }>>;
  cancelSubscription(organizationId: string): Promise<Result<void>>;
  reportUsage(report: UsageReport): Promise<Result<void>>;
  checkUsageLimits(organizationId: string): Promise<Result<{ allowed: boolean; remaining: Record<string, number> }>>;
}

export class BillingService extends BaseService implements IBillingService {
  private readonly plans: Map<string, BillingPlan>;

  constructor(
    logger: ILogger,
    eventBus: IEventBus,
    private readonly analytics: IAnalyticsService,
  ) {
    super(logger, eventBus);

    // Default plans — in production, these come from a database
    this.plans = new Map([
      ['free', {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'USD',
        interval: 'month',
        features: ['basic_api', 'community_support'],
        limits: { requests: 1000, storage: 100, members: 3 },
      }],
      ['starter', {
        id: 'starter',
        name: 'Starter',
        price: 29,
        currency: 'USD',
        interval: 'month',
        features: ['basic_api', 'email_support', 'analytics'],
        limits: { requests: 10000, storage: 1000, members: 10 },
      }],
      ['pro', {
        id: 'pro',
        name: 'Pro',
        price: 99,
        currency: 'USD',
        interval: 'month',
        features: ['advanced_api', 'priority_support', 'analytics', 'secrets_manager'],
        limits: { requests: 100000, storage: 10000, members: 50 },
      }],
      ['enterprise', {
        id: 'enterprise',
        name: 'Enterprise',
        price: 499,
        currency: 'USD',
        interval: 'month',
        features: ['all_features', 'dedicated_support', 'sla', 'custom_limits'],
        limits: { requests: 1000000, storage: 100000, members: -1 },
      }],
    ]);
  }

  async getPlans(): Promise<Result<readonly BillingPlan[]>> {
    return this.success([...this.plans.values()]);
  }

  async getPlan(planId: string): Promise<Result<BillingPlan>> {
    const plan = this.plans.get(planId);
    if (!plan) return this.failure(ErrorCode.BILLING_PLAN_NOT_FOUND, `Plan ${planId} not found`);
    return this.success(plan);
  }

  async getSubscription(_organizationId: string): Promise<Result<Subscription | null>> {
    // In production, query Firestore
    return this.success(null);
  }

  async createCheckoutSession(
    organizationId: string,
    planId: string,
  ): Promise<Result<{ url: string }>> {
    const plan = this.plans.get(planId);
    if (!plan) return this.failure(ErrorCode.BILLING_PLAN_NOT_FOUND, `Plan ${planId} not found`);

    // In production, create a Stripe/Paddle checkout session
    const sessionId = crypto.randomUUID();
    this.logger.info({ organizationId, planId, sessionId }, 'Checkout session created');

    return this.success({ url: `/checkout/${sessionId}` });
  }

  async cancelSubscription(organizationId: string): Promise<Result<void>> {
    this.logger.info({ organizationId }, 'Subscription canceled');
    await this.emitEvent(DomainEvent.BILLING_SUBSCRIPTION_CANCELED, organizationId, 'Organization', {});
    return this.success(undefined);
  }

  async reportUsage(report: UsageReport): Promise<Result<void>> {
    await this.analytics.track({
      name: `usage:${report.metric}`,
      organizationId: report.organizationId,
      properties: { quantity: report.quantity },
      timestamp: report.timestamp,
    });

    await this.emitEvent(DomainEvent.BILLING_USAGE_REPORTED, report.organizationId, 'Organization', {
      metric: report.metric,
      quantity: report.quantity,
    });

    return this.success(undefined);
  }

  async checkUsageLimits(
    organizationId: string,
  ): Promise<Result<{ allowed: boolean; remaining: Record<string, number> }>> {
    // In production, check against current plan limits
    return this.success({
      allowed: true,
      remaining: { requests: 9999, storage: 999, members: 99 },
    });
  }
}
