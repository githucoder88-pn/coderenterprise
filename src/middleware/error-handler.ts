/**
 * Error Handler Middleware
 *
 * Global error boundary that converts thrown errors to consistent API responses.
 */

import { createMiddleware } from 'hono/factory';
import type { StatusCode } from 'hono/utils/http-status';
import { ErrorCode, type AppError } from '../types/index.js';
import type { ILogger } from '../telemetry/logger.js';

const ERROR_STATUS_MAP: Record<ErrorCode, StatusCode> = {
  [ErrorCode.UNKNOWN]: 500,
  [ErrorCode.VALIDATION]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL]: 500,
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 401,
  [ErrorCode.AUTH_TOKEN_INVALID]: 401,
  [ErrorCode.AUTH_USER_DISABLED]: 403,
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: 403,
  [ErrorCode.AUTH_MFA_REQUIRED]: 403,
  [ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.ORG_NOT_FOUND]: 404,
  [ErrorCode.ORG_LIMIT_REACHED]: 400,
  [ErrorCode.ORG_MEMBER_EXISTS]: 409,
  [ErrorCode.ORG_INVITE_EXPIRED]: 410,
  [ErrorCode.BILLING_PAYMENT_FAILED]: 402,
  [ErrorCode.BILLING_PLAN_NOT_FOUND]: 404,
  [ErrorCode.BILLING_SUBSCRIPTION_EXPIRED]: 402,
  [ErrorCode.BILLING_USAGE_EXCEEDED]: 429,
  [ErrorCode.STORAGE_UPLOAD_FAILED]: 500,
  [ErrorCode.STORAGE_FILE_TOO_LARGE]: 413,
  [ErrorCode.STORAGE_INVALID_TYPE]: 415,
  [ErrorCode.QUEUE_JOB_FAILED]: 500,
  [ErrorCode.QUEUE_TIMEOUT]: 504,
};

export function errorHandlerMiddleware(logger: ILogger) {
  return createMiddleware(async (c, next) => {
    try {
      await next();
    } catch (error: unknown) {
      const requestId = c.get('requestId') ?? 'unknown';
      const appError = normalizeError(error);

      const status = ERROR_STATUS_MAP[appError.code] ?? 500;

      if (status >= 500) {
        logger.error(
          { error: appError, requestId, path: c.req.path },
          `Server error: ${appError.message}`,
        );
      } else {
        logger.warn(
          { error: appError, requestId, path: c.req.path },
          `Client error: ${appError.message}`,
        );
      }

      return c.json(
        {
          success: false,
          error: {
            code: appError.code,
            message: appError.message,
            ...(appError.details ? { details: appError.details } : {}),
          },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        },
        status as 200,
      );
    }
  });
}

function normalizeError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return {
      code: ErrorCode.INTERNAL,
      message: error.message,
      cause: error,
      timestamp: new Date(),
    };
  }

  return {
    code: ErrorCode.UNKNOWN,
    message: String(error),
    timestamp: new Date(),
  };
}

function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'timestamp' in error
  );
}
