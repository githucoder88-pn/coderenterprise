/**
 * CODER Enterprise - Shared Type Definitions
 *
 * Central type registry for the entire application.
 * All domain types, utility types, and shared interfaces live here.
 */

// ─── Utility Types ───────────────────────────────────────────────────────────

export type Prettify<T> = { [K in keyof T]: T[K] } & {};
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];
export type OptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];
export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;
export type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
export type Nullable<T> = T | null;
export type AsyncResult<T> = Promise<Result<T>>;
export type Brand<T, B extends string> = T & { readonly __brand: B };

// ─── Result Pattern ──────────────────────────────────────────────────────────

export type Result<T, E = AppError> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.success) return result.data;
  throw result.error;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationParams {
  readonly page: number;
  readonly limit: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
    readonly hasNext: boolean;
    readonly hasPrev: boolean;
  };
}

export function createPaginatedResponse<T>(
  data: readonly T[],
  total: number,
  params: PaginationParams,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}

// ─── Timestamps ──────────────────────────────────────────────────────────────

export interface Timestamps {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SoftDeletable extends Timestamps {
  readonly deletedAt: Date | null;
}

// ─── Auth Context ────────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  readonly uid: string;
  readonly email: string;
  readonly organizationId: string;
  readonly role: string;
  readonly permissions: readonly string[];
}

export interface RequestContext {
  readonly requestId: string;
  readonly user?: AuthenticatedUser;
  readonly organizationId?: string;
  readonly ip: string;
  readonly userAgent: string;
}

// ─── Domain Errors ───────────────────────────────────────────────────────────

export enum ErrorCode {
  // General
  UNKNOWN = 'UNKNOWN',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL = 'INTERNAL',
  BAD_REQUEST = 'BAD_REQUEST',

  // Auth
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_USER_DISABLED = 'AUTH_USER_DISABLED',
  AUTH_EMAIL_NOT_VERIFIED = 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_MFA_REQUIRED = 'AUTH_MFA_REQUIRED',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',

  // Organization
  ORG_NOT_FOUND = 'ORG_NOT_FOUND',
  ORG_LIMIT_REACHED = 'ORG_LIMIT_REACHED',
  ORG_MEMBER_EXISTS = 'ORG_MEMBER_EXISTS',
  ORG_INVITE_EXPIRED = 'ORG_INVITE_EXPIRED',

  // Billing
  BILLING_PAYMENT_FAILED = 'BILLING_PAYMENT_FAILED',
  BILLING_PLAN_NOT_FOUND = 'BILLING_PLAN_NOT_FOUND',
  BILLING_SUBSCRIPTION_EXPIRED = 'BILLING_SUBSCRIPTION_EXPIRED',
  BILLING_USAGE_EXCEEDED = 'BILLING_USAGE_EXCEEDED',

  // Storage
  STORAGE_UPLOAD_FAILED = 'STORAGE_UPLOAD_FAILED',
  STORAGE_FILE_TOO_LARGE = 'STORAGE_FILE_TOO_LARGE',
  STORAGE_INVALID_TYPE = 'STORAGE_INVALID_TYPE',

  // Queue
  QUEUE_JOB_FAILED = 'QUEUE_JOB_FAILED',
  QUEUE_TIMEOUT = 'QUEUE_TIMEOUT',
}

export interface AppError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: Error;
  readonly timestamp: Date;
}

export function createError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  cause?: Error,
): AppError {
  return {
    code,
    message,
    details,
    cause,
    timestamp: new Date(),
  };
}

// ─── Event System ────────────────────────────────────────────────────────────

export enum DomainEvent {
  // User Events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_SUSPENDED = 'user.suspended',

  // Organization Events
  ORG_CREATED = 'organization.created',
  ORG_UPDATED = 'organization.updated',
  ORG_DELETED = 'organization.deleted',
  ORG_MEMBER_ADDED = 'organization.member.added',
  ORG_MEMBER_REMOVED = 'organization.member.removed',
  ORG_MEMBER_ROLE_CHANGED = 'organization.member.role.changed',

  // Auth Events
  AUTH_SIGN_IN = 'auth.sign_in',
  AUTH_SIGN_OUT = 'auth.sign_out',
  AUTH_SIGN_UP = 'auth.sign_up',
  AUTH_PASSWORD_CHANGED = 'auth.password.changed',
  AUTH_MFA_ENABLED = 'auth.mfa.enabled',
  AUTH_MFA_DISABLED = 'auth.mfa.disabled',

  // API Key Events
  APIKEY_CREATED = 'apikey.created',
  APIKEY_REVOKED = 'apikey.revoked',
  APIKEY_USED = 'apikey.used',

  // Billing Events
  BILLING_SUBSCRIPTION_CREATED = 'billing.subscription.created',
  BILLING_SUBSCRIPTION_CANCELED = 'billing.subscription.canceled',
  BILLING_PAYMENT_SUCCEEDED = 'billing.payment.succeeded',
  BILLING_PAYMENT_FAILED = 'billing.payment.failed',
  BILLING_USAGE_REPORTED = 'billing.usage.reported',

  // Audit Events
  AUDIT_ACTION = 'audit.action',
}

export interface DomainEventPayload {
  readonly eventId: string;
  readonly event: DomainEvent;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly data: Record<string, unknown>;
  readonly metadata?: {
    readonly userId?: string;
    readonly organizationId?: string;
    readonly requestId?: string;
    readonly ip?: string;
  };
}

// ─── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
  readonly meta?: {
    readonly requestId: string;
    readonly timestamp: string;
    readonly version: string;
  };
}

// ─── HTTP Methods ────────────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// ─── Permission Types ────────────────────────────────────────────────────────

export type Permission =
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  | 'organizations:read'
  | 'organizations:write'
  | 'organizations:delete'
  | 'organizations:manage_members'
  | 'apikeys:read'
  | 'apikeys:write'
  | 'apikeys:delete'
  | 'billing:read'
  | 'billing:write'
  | 'audit:read'
  | 'secrets:read'
  | 'secrets:write'
  | 'secrets:delete'
  | 'analytics:read'
  | 'admin:all';

export type Role = 'owner' | 'admin' | 'member' | 'viewer' | 'service';

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: ['admin:all'],
  admin: [
    'users:read', 'users:write', 'users:delete',
    'organizations:read', 'organizations:write', 'organizations:manage_members',
    'apikeys:read', 'apikeys:write', 'apikeys:delete',
    'billing:read', 'billing:write',
    'audit:read',
    'secrets:read', 'secrets:write', 'secrets:delete',
    'analytics:read',
  ],
  member: [
    'users:read',
    'organizations:read',
    'apikeys:read', 'apikeys:write',
    'billing:read',
    'secrets:read', 'secrets:write',
    'analytics:read',
  ],
  viewer: [
    'users:read',
    'organizations:read',
    'apikeys:read',
    'billing:read',
    'audit:read',
    'analytics:read',
  ],
  service: [
    'users:read',
    'organizations:read',
    'apikeys:read',
  ],
};
