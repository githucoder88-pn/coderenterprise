/**
 * Subscription Service
 *
 * Manages subscription lifecycle: create, upgrade, downgrade, cancel, reactivate.
 * Integrates with billing plans and quota management.
 */

import type { Subscription, BillingPlan } from './types.js';
import type { QuotaService } from './quota-service.js';
import type { ILogger } from '../telemetry/logger.js';
import { ErrorCode, type Result } from '../types/index.js';

export interface ISubscriptionService {
  create(orgId: string, planId: string, trialDays?: number): Promise<Result<Subscription>>;
  get(orgId: string): Promise<Subscription | null>;
  getById(id: string): Promise<Subscription | null>;
  upgrade(orgId: string, newPlanId: string): Promise<Result<Subscription>>;
  downgrade(orgId: string, newPlanId: string): Promise<Result<Subscription>>;
  cancel(orgId: string, immediate?: boolean): Promise<Result<Subscription>>;
  reactivate(orgId: string): Promise<Result<Subscription>>;
  pause(orgId: string): Promise<Result<Subscription>>;
  resume(orgId: string): Promise<Result<Subscription>>;
  listPlans(): readonly BillingPlan[];
  getPlan(planId: string): BillingPlan | null;
  checkAccess(orgId: string, feature: string): boolean;
  checkModelAccess(orgId: string, modelId: string): boolean;
}

export class SubscriptionService implements ISubscriptionService {
  private readonly subscriptions = new Map<string, Subscription>();
  private readonly plans = new Map<string, BillingPlan>();

  constructor(
    private readonly quotaService: QuotaService,
    private readonly logger: ILogger,
  ) {
    this.initDefaultPlans();
  }

  async create(orgId: string, planId: string, trialDays = 0): Promise<Result<Subscription>> {
    const plan = this.plans.get(planId);
    if (!plan) return { success: false, error: { code: ErrorCode.BILLING_PLAN_NOT_FOUND, message: `Plan ${planId} not found`, timestamp: new Date() } };

    // Check for existing active subscription
    const existing = this.subscriptions.get(orgId);
    if (existing && existing.status === 'active') {
      return { success: false, error: { code: ErrorCode.CONFLICT, message: 'Organization already has an active subscription', timestamp: new Date() } };
    }

    const now = new Date();
    const subscription: Subscription = {
      id: crypto.randomUUID(), organizationId: orgId, planId,
      status: trialDays > 0 ? 'trialing' : 'active',
      currentPeriodStart: now, currentPeriodEnd: new Date(now.getTime() + 30 * 86400_000),
      cancelAt: null, canceledAt: null,
      trialEnd: trialDays > 0 ? new Date(now.getTime() + trialDays * 86400_000) : null,
      providerSubscriptionId: null, metadata: {},
      createdAt: now, updatedAt: now,
    };

    this.subscriptions.set(orgId, subscription);

    // Set quotas from plan
    for (const q of plan.quotas) {
      this.quotaService.setQuota(orgId, q.metric, q.limit, q.period, q.hardLimit);
    }

    this.logger.info({ orgId, planId, trialDays }, 'Subscription created');
    return { success: true, data: subscription };
  }

  async get(orgId: string): Promise<Subscription | null> {
    return this.subscriptions.get(orgId) ?? null;
  }

  async getById(id: string): Promise<Subscription | null> {
    for (const sub of this.subscriptions.values()) {
      if (sub.id === id) return sub;
    }
    return null;
  }

  async upgrade(orgId: string, newPlanId: string): Promise<Result<Subscription>> {
    const sub = this.subscriptions.get(orgId);
    if (!sub) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'No subscription found', timestamp: new Date() } };

    const newPlan = this.plans.get(newPlanId);
    if (!newPlan) return { success: false, error: { code: ErrorCode.BILLING_PLAN_NOT_FOUND, message: `Plan ${newPlanId} not found`, timestamp: new Date() } };

    const currentPlan = this.plans.get(sub.planId);
    if (currentPlan && newPlan.price < currentPlan.price) {
      return { success: false, error: { code: ErrorCode.VALIDATION, message: 'Use downgrade for lower-tier plans', timestamp: new Date() } };
    }

    const updated = { ...sub, planId: newPlanId, updatedAt: new Date() };
    this.subscriptions.set(orgId, updated);

    // Update quotas
    for (const q of newPlan.quotas) {
      this.quotaService.setQuota(orgId, q.metric, q.limit, q.period, q.hardLimit);
    }

    this.logger.info({ orgId, newPlanId }, 'Subscription upgraded');
    return { success: true, data: updated };
  }

  async downgrade(orgId: string, newPlanId: string): Promise<Result<Subscription>> {
    const sub = this.subscriptions.get(orgId);
    if (!sub) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'No subscription found', timestamp: new Date() } };

    const newPlan = this.plans.get(newPlanId);
    if (!newPlan) return { success: false, error: { code: ErrorCode.BILLING_PLAN_NOT_FOUND, message: `Plan ${newPlanId} not found`, timestamp: new Date() } };

    const updated = { ...sub, planId: newPlanId, updatedAt: new Date() };
    this.subscriptions.set(orgId, updated);

    for (const q of newPlan.quotas) {
      this.quotaService.setQuota(orgId, q.metric, q.limit, q.period, q.hardLimit);
    }

    this.logger.info({ orgId, newPlanId }, 'Subscription downgraded');
    return { success: true, data: updated };
  }

  async cancel(orgId: string, immediate = false): Promise<Result<Subscription>> {
    const sub = this.subscriptions.get(orgId);
    if (!sub) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'No subscription found', timestamp: new Date() } };

    const now = new Date();
    const updated: Subscription = {
      ...sub, status: immediate ? 'canceled' : sub.status,
      cancelAt: immediate ? now : sub.currentPeriodEnd,
      canceledAt: immediate ? now : null,
      updatedAt: now,
    };

    this.subscriptions.set(orgId, updated);
    this.logger.info({ orgId, immediate }, 'Subscription canceled');
    return { success: true, data: updated };
  }

  async reactivate(orgId: string): Promise<Result<Subscription>> {
    const sub = this.subscriptions.get(orgId);
    if (!sub) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'No subscription found', timestamp: new Date() } };

    const updated = { ...sub, status: 'active' as const, cancelAt: null, canceledAt: null, updatedAt: new Date() };
    this.subscriptions.set(orgId, updated);
    this.logger.info({ orgId }, 'Subscription reactivated');
    return { success: true, data: updated };
  }

  async pause(orgId: string): Promise<Result<Subscription>> {
    const sub = this.subscriptions.get(orgId);
    if (!sub) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'No subscription found', timestamp: new Date() } };
    const updated = { ...sub, status: 'paused' as const, updatedAt: new Date() };
    this.subscriptions.set(orgId, updated);
    return { success: true, data: updated };
  }

  async resume(orgId: string): Promise<Result<Subscription>> {
    return this.reactivate(orgId);
  }

  listPlans(): readonly BillingPlan[] {
    return [...this.plans.values()];
  }

  getPlan(planId: string): BillingPlan | null {
    return this.plans.get(planId) ?? null;
  }

  checkAccess(orgId: string, feature: string): boolean {
    const sub = this.subscriptions.get(orgId);
    if (!sub || sub.status === 'canceled') return false;
    const plan = this.plans.get(sub.planId);
    return plan?.features.includes(feature) ?? false;
  }

  checkModelAccess(orgId: string, modelId: string): boolean {
    const sub = this.subscriptions.get(orgId);
    if (!sub || sub.status === 'canceled') return false;
    const plan = this.plans.get(sub.planId);
    if (!plan) return false;
    return plan.modelAccess.includes('*') || plan.modelAccess.includes(modelId);
  }

  private initDefaultPlans(): void {
    const plans: BillingPlan[] = [
      {
        id: 'free', name: 'Free', slug: 'free', description: 'Get started with CODER',
        price: 0, currency: 'USD', interval: 'month',
        features: ['basic_api', 'community_support'],
        quotas: [
          { metric: 'requests', limit: 1000, period: 'monthly', hardLimit: true },
          { metric: 'tokens', limit: 100_000, period: 'monthly', hardLimit: true },
          { metric: 'cost', limit: 5, period: 'monthly', hardLimit: true },
          { metric: 'conversations', limit: 50, period: 'monthly', hardLimit: true },
        ],
        modelAccess: ['*'],
        metadata: {}, createdAt: new Date(), updatedAt: new Date(),
      },
      {
        id: 'starter', name: 'Starter', slug: 'starter', description: 'For individuals and small teams',
        price: 29, currency: 'USD', interval: 'month',
        features: ['basic_api', 'email_support', 'analytics', 'file_storage'],
        quotas: [
          { metric: 'requests', limit: 10_000, period: 'monthly', hardLimit: true },
          { metric: 'tokens', limit: 5_000_000, period: 'monthly', hardLimit: false },
          { metric: 'cost', limit: 100, period: 'monthly', hardLimit: false },
          { metric: 'conversations', limit: 500, period: 'monthly', hardLimit: true },
        ],
        modelAccess: ['*'],
        metadata: {}, createdAt: new Date(), updatedAt: new Date(),
      },
      {
        id: 'pro', name: 'Pro', slug: 'pro', description: 'For growing teams',
        price: 99, currency: 'USD', interval: 'month',
        features: ['advanced_api', 'priority_support', 'analytics', 'secrets_manager', 'file_storage', 'webhooks'],
        quotas: [
          { metric: 'requests', limit: 100_000, period: 'monthly', hardLimit: false },
          { metric: 'tokens', limit: 50_000_000, period: 'monthly', hardLimit: false },
          { metric: 'cost', limit: 500, period: 'monthly', hardLimit: false },
          { metric: 'conversations', limit: 5_000, period: 'monthly', hardLimit: false },
        ],
        modelAccess: ['*'],
        metadata: {}, createdAt: new Date(), updatedAt: new Date(),
      },
      {
        id: 'enterprise', name: 'Enterprise', slug: 'enterprise', description: 'For large organizations',
        price: 499, currency: 'USD', interval: 'month',
        features: ['all_features', 'dedicated_support', 'sla', 'custom_limits', 'sso', 'audit_logs', 'advanced_security'],
        quotas: [
          { metric: 'requests', limit: 1_000_000, period: 'monthly', hardLimit: false },
          { metric: 'tokens', limit: 500_000_000, period: 'monthly', hardLimit: false },
          { metric: 'cost', limit: 5_000, period: 'monthly', hardLimit: false },
          { metric: 'conversations', limit: 50_000, period: 'monthly', hardLimit: false },
        ],
        modelAccess: ['*'],
        metadata: {}, createdAt: new Date(), updatedAt: new Date(),
      },
    ];
    for (const plan of plans) this.plans.set(plan.id, plan);
  }
}
