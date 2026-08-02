/**
 * Enterprise Platform — Core Types
 */

import { z } from 'zod';
import type { Timestamps } from '../types/index.js';

// ─── Organization Hierarchy ──────────────────────────────────────────────────

export type OrganizationPlan = 'free' | 'starter' | 'pro' | 'enterprise' | 'custom';

export interface Organization extends Timestamps {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly plan: OrganizationPlan;
  readonly status: 'active' | 'suspended' | 'deactivated';
  readonly ownerId: string;
  readonly domain: string | null;
  readonly logoUrl: string | null;
  readonly settings: OrganizationSettings;
  readonly memberCount: number;
  readonly departmentCount: number;
  readonly metadata: Record<string, unknown>;
}

export interface OrganizationSettings {
  readonly ssoEnabled: boolean;
  readonly mfaRequired: boolean;
  readonly allowedDomains: readonly string[];
  readonly sessionTimeoutMs: number;
  readonly maxMembers: number;
  readonly dataRetentionDays: number;
  readonly defaultRole: EnterpriseRole;
  readonly ipWhitelist: readonly string[];
  readonly features: Record<string, boolean>;
}

export interface Department extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string;
  readonly leadUserId: string | null;
  readonly teamCount: number;
  readonly budget: DepartmentBudget | null;
  readonly metadata: Record<string, unknown>;
}

export interface DepartmentBudget {
  readonly monthlyLimit: number;
  readonly currency: string;
  readonly alertThresholdPercent: number;
  readonly currentSpend: number;
}

// ─── Teams ───────────────────────────────────────────────────────────────────

export interface Team extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly departmentId: string | null;
  readonly name: string;
  readonly description: string;
  readonly leadUserId: string | null;
  readonly memberCount: number;
  readonly permissions: readonly string[];
  readonly metadata: Record<string, unknown>;
}

// ─── Members & Roles ─────────────────────────────────────────────────────────

export type EnterpriseRole = 'owner' | 'administrator' | 'manager' | 'developer' | 'reviewer' | 'auditor' | 'viewer';

export interface Member extends Timestamps {
  readonly id: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly role: EnterpriseRole;
  readonly departmentId: string | null;
  readonly teamIds: readonly string[];
  readonly status: 'active' | 'invited' | 'suspended' | 'deactivated';
  readonly invitedAt: Date | null;
  readonly joinedAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export interface RoleDefinition {
  readonly role: EnterpriseRole;
  readonly permissions: readonly string[];
  readonly description: string;
  readonly isSystem: boolean;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<EnterpriseRole, readonly string[]> = {
  owner: ['*'],
  administrator: [
    'org:read', 'org:write', 'org:manage_members', 'org:manage_settings',
    'team:create', 'team:update', 'team:delete', 'team:manage_members',
    'project:create', 'project:update', 'project:delete',
    'workspace:create', 'workspace:update', 'workspace:delete',
    'billing:read', 'billing:write',
    'security:read', 'security:write',
    'audit:read',
    'deployment:create', 'deployment:manage',
    'agent:create', 'agent:manage', 'agent:execute',
    'api_key:create', 'api_key:revoke',
  ],
  manager: [
    'org:read', 'team:read', 'team:manage_members',
    'project:create', 'project:update', 'project:delete',
    'workspace:create', 'workspace:update',
    'billing:read', 'agent:create', 'agent:manage',
    'audit:read',
  ],
  developer: [
    'org:read', 'team:read', 'project:read',
    'workspace:create', 'workspace:update',
    'agent:create', 'agent:execute',
    'api_key:create',
  ],
  reviewer: [
    'org:read', 'team:read', 'project:read',
    'workspace:read', 'agent:read',
    'audit:read',
  ],
  auditor: [
    'org:read', 'team:read', 'project:read', 'workspace:read',
    'billing:read', 'security:read', 'audit:read',
    'agent:read',
  ],
  viewer: [
    'org:read', 'team:read', 'project:read', 'workspace:read',
  ],
};

// ─── Projects ────────────────────────────────────────────────────────────────

export interface Project extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly departmentId: string | null;
  readonly teamId: string | null;
  readonly name: string;
  readonly description: string;
  readonly status: 'active' | 'archived' | 'deleted';
  readonly visibility: 'private' | 'internal' | 'public';
  readonly workspaceCount: number;
  readonly settings: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
}

// ─── Policies ────────────────────────────────────────────────────────────────

export type PolicyType = 'rbac' | 'abac' | 'resource' | 'workspace' | 'agent' | 'network' | 'data';

export interface Policy extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string;
  readonly type: PolicyType;
  readonly rules: readonly PolicyRule[];
  readonly enabled: boolean;
  readonly priority: number;
  readonly metadata: Record<string, unknown>;
}

export interface PolicyRule {
  readonly effect: 'allow' | 'deny';
  readonly action: string | readonly string[];
  readonly resource: string | readonly string[];
  readonly conditions: Record<string, unknown> | null;
  readonly principals: readonly string[] | null;
}

// ─── Compliance ──────────────────────────────────────────────────────────────

export type ComplianceFramework = 'soc2' | 'gdpr' | 'hipaa' | 'iso27001' | 'pci-dss' | 'custom';

export interface CompliancePolicy extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly framework: ComplianceFramework;
  readonly name: string;
  readonly rules: readonly ComplianceRule[];
  readonly status: 'active' | 'draft' | 'archived';
  readonly lastAuditAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export interface ComplianceRule {
  readonly id: string;
  readonly control: string;
  readonly description: string;
  readonly requirement: string;
  readonly status: 'compliant' | 'non_compliant' | 'not_applicable' | 'pending';
  readonly evidence: readonly string[];
  readonly lastCheckedAt: Date | null;
}

// ─── Security ────────────────────────────────────────────────────────────────

export interface SecurityPolicy extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly mfaRequired: boolean;
  readonly passwordPolicy: PasswordPolicy;
  readonly sessionPolicy: SessionPolicy;
  readonly networkPolicy: NetworkPolicy;
  readonly encryptionPolicy: EncryptionPolicy;
  readonly metadata: Record<string, unknown>;
}

export interface PasswordPolicy {
  readonly minLength: number;
  readonly requireUppercase: boolean;
  readonly requireLowercase: boolean;
  readonly requireNumbers: boolean;
  readonly requireSpecial: boolean;
  readonly maxAgeDays: number;
  readonly preventReuse: number;
}

export interface SessionPolicy {
  readonly maxDurationMs: number;
  readonly idleTimeoutMs: number;
  readonly maxConcurrentSessions: number;
  readonly requireReauthForSensitive: boolean;
}

export interface NetworkPolicy {
  readonly allowedIpRanges: readonly string[];
  readonly blockedIpRanges: readonly string[];
  readonly requireVpn: boolean;
  readonly allowedCountries: readonly string[];
}

export interface EncryptionPolicy {
  readonly atRestAlgorithm: string;
  readonly inTransitProtocol: string;
  readonly keyRotationDays: number;
  readonly minimumKeyLength: number;
}

// ─── Deployment ──────────────────────────────────────────────────────────────

export interface Deployment extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly projectId: string;
  readonly environment: 'development' | 'staging' | 'production';
  readonly version: string;
  readonly status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'rolled_back';
  readonly deployedBy: string;
  readonly deployedAt: Date | null;
  readonly rollbackVersion: string | null;
  readonly metadata: Record<string, unknown>;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['free', 'starter', 'pro', 'enterprise', 'custom']).default('free'),
  domain: z.string().nullable().optional(),
  settings: z.object({
    ssoEnabled: z.boolean().default(false),
    mfaRequired: z.boolean().default(false),
    allowedDomains: z.array(z.string()).default([]),
    sessionTimeoutMs: z.number().int().positive().default(3600000),
    maxMembers: z.number().int().positive().default(100),
    dataRetentionDays: z.number().int().positive().default(365),
    defaultRole: z.enum(['owner', 'administrator', 'manager', 'developer', 'reviewer', 'auditor', 'viewer']).default('developer'),
    ipWhitelist: z.array(z.string()).default([]),
    features: z.record(z.boolean()).default({}),
  }).default({}),
});

export const CreateTeamSchema = z.object({
  name: z.string().min(1).max(100),
  departmentId: z.string().nullable().optional(),
  description: z.string().max(500).default(''),
  leadUserId: z.string().nullable().optional(),
  permissions: z.array(z.string()).default([]),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  departmentId: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
  visibility: z.enum(['private', 'internal', 'public']).default('private'),
  settings: z.record(z.unknown()).default({}),
});

export const CreatePolicySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  type: z.enum(['rbac', 'abac', 'resource', 'workspace', 'agent', 'network', 'data']),
  rules: z.array(z.object({
    effect: z.enum(['allow', 'deny']),
    action: z.union([z.string(), z.array(z.string())]),
    resource: z.union([z.string(), z.array(z.string())]),
    conditions: z.record(z.unknown()).nullable().optional(),
    principals: z.array(z.string()).nullable().optional(),
  })).min(1),
  priority: z.number().int().min(0).max(1000).default(100),
});
