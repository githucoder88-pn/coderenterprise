/**
 * Marketplace Platform — Core Types
 */

import { z } from 'zod';
import type { Timestamps } from '../types/index.js';

// ─── Artifact Types ──────────────────────────────────────────────────────────

export type ArtifactKind = 'agent' | 'extension' | 'tool' | 'workflow' | 'prompt' | 'theme' | 'provider' | 'template';

export type ArtifactStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected' | 'suspended' | 'archived';

export type MonetizationType = 'free' | 'one_time' | 'subscription' | 'usage_based' | 'enterprise';

// ─── Publisher ───────────────────────────────────────────────────────────────

export interface Publisher extends Timestamps {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly slug: string;
  readonly email: string;
  readonly avatarUrl: string | null;
  readonly bio: string;
  readonly website: string | null;
  readonly verified: boolean;
  readonly packageCount: number;
  readonly totalDownloads: number;
  readonly reputation: number;
  readonly metadata: Record<string, unknown>;
}

// ─── Package ─────────────────────────────────────────────────────────────────

export interface Package extends Timestamps {
  readonly id: string;
  readonly publisherId: string;
  readonly name: string;
  readonly slug: string;
  readonly displayName: string;
  readonly description: string;
  readonly kind: ArtifactKind;
  readonly status: ArtifactStatus;
  readonly latestVersion: string;
  readonly license: string;
  readonly homepage: string | null;
  readonly repository: string | null;
  readonly icon: string | null;
  readonly banner: string | null;
  readonly screenshots: readonly string[];
  readonly categories: readonly string[];
  readonly tags: readonly string[];
  readonly keywords: readonly string[];
  readonly monetization: MonetizationConfig;
  readonly stats: PackageStats;
  readonly featured: boolean;
  readonly verified: boolean;
  readonly metadata: Record<string, unknown>;
}

export interface MonetizationConfig {
  readonly type: MonetizationType;
  readonly price: number;
  readonly currency: string;
  readonly interval: 'month' | 'year' | null;
  readonly trialDays: number;
  readonly enterpriseContact: string | null;
}

export interface PackageStats {
  readonly downloads: number;
  readonly downloadsWeek: number;
  readonly downloadsMonth: number;
  readonly activeInstalls: number;
  readonly rating: number;
  readonly ratingCount: number;
  readonly reviewCount: number;
  readonly qualityScore: number;
  readonly compatibilityScore: number;
}

// ─── Version ─────────────────────────────────────────────────────────────────

export interface PackageVersion extends Timestamps {
  readonly id: string;
  readonly packageId: string;
  readonly version: string;
  readonly changelog: string;
  readonly status: 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected';
  readonly artifactUrl: string;
  readonly artifactSize: number;
  readonly artifactHash: string;
  readonly manifest: Record<string, unknown>;
  readonly dependencies: readonly VersionDependency[];
  readonly permissions: readonly string[];
  readonly securityScan: SecurityScanResult | null;
  readonly publishedAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export interface VersionDependency {
  readonly packageId: string;
  readonly versionRange: string;
  readonly optional: boolean;
}

export interface SecurityScanResult {
  readonly scannedAt: Date;
  readonly passed: boolean;
  readonly issues: readonly { severity: 'low' | 'medium' | 'high' | 'critical'; message: string; file?: string }[];
  readonly score: number;
}

// ─── Review ──────────────────────────────────────────────────────────────────

export interface Review extends Timestamps {
  readonly id: string;
  readonly packageId: string;
  readonly versionId: string;
  readonly userId: string;
  readonly rating: number;
  readonly title: string;
  readonly body: string;
  readonly helpful: number;
  readonly reported: boolean;
  readonly response: { readonly body: string; readonly at: Date } | null;
}

// ─── Rating ──────────────────────────────────────────────────────────────────

export interface Rating extends Timestamps {
  readonly id: string;
  readonly packageId: string;
  readonly userId: string;
  readonly score: number;
}

// ─── Subscription ────────────────────────────────────────────────────────────

export interface PackageSubscription extends Timestamps {
  readonly id: string;
  readonly packageId: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly plan: string;
  readonly status: 'active' | 'canceled' | 'expired' | 'trialing';
  readonly currentPeriodStart: Date;
  readonly currentPeriodEnd: Date;
  readonly cancelAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

// ─── Download ────────────────────────────────────────────────────────────────

export interface Download extends Timestamps {
  readonly id: string;
  readonly packageId: string;
  readonly versionId: string;
  readonly userId: string;
  readonly ip: string;
  readonly userAgent: string;
  readonly metadata: Record<string, unknown>;
}

// ─── Category ────────────────────────────────────────────────────────────────

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly icon: string;
  readonly packageCount: number;
  readonly parentId: string | null;
}

// ─── License ─────────────────────────────────────────────────────────────────

export interface License {
  readonly id: string;
  readonly name: string;
  readonly spdxId: string;
  readonly url: string;
  readonly isOsiApproved: boolean;
}

// ─── Moderation ──────────────────────────────────────────────────────────────

export interface ModerationAction extends Timestamps {
  readonly id: string;
  readonly packageId: string;
  readonly action: 'approve' | 'reject' | 'suspend' | 'restore' | 'remove';
  readonly reason: string;
  readonly moderatorId: string;
  readonly metadata: Record<string, unknown>;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const PublishPackageSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  kind: z.enum(['agent', 'extension', 'tool', 'workflow', 'prompt', 'theme', 'provider', 'template']),
  license: z.string().default('MIT'),
  homepage: z.string().url().nullable().optional(),
  repository: z.string().url().nullable().optional(),
  icon: z.string().nullable().optional(),
  categories: z.array(z.string()).min(1).max(5),
  tags: z.array(z.string().max(30)).max(20).default([]),
  keywords: z.array(z.string().max(50)).max(20).default([]),
  monetization: z.object({
    type: z.enum(['free', 'one_time', 'subscription', 'usage_based', 'enterprise']).default('free'),
    price: z.number().min(0).default(0),
    currency: z.string().default('USD'),
    interval: z.enum(['month', 'year']).nullable().default(null),
    trialDays: z.number().int().min(0).default(0),
    enterpriseContact: z.string().nullable().default(null),
  }).default({ type: 'free', price: 0, currency: 'USD', interval: null, trialDays: 0, enterpriseContact: null }),
});

export const PublishVersionSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  changelog: z.string().max(10_000).default(''),
  dependencies: z.array(z.object({
    packageId: z.string(),
    versionRange: z.string(),
    optional: z.boolean().default(false),
  })).default([]),
  permissions: z.array(z.string()).default([]),
});

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

export const SearchPackagesSchema = z.object({
  query: z.string().optional(),
  kind: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  monetization: z.string().optional(),
  sort: z.enum(['relevance', 'downloads', 'rating', 'newest', 'updated']).default('relevance'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
