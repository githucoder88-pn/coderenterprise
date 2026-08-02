/**
 * Base Service
 *
 * Provides common service operations: logging, event emission, error wrapping.
 * All domain services extend this.
 */

import type { IEventBus } from './event-bus.js';
import type { ILogger } from '../telemetry/logger.js';
import type { DomainEvent, DomainEventPayload } from '../types/index.js';
import { ErrorCode, createError, type AppError, type Result, ok, err } from '../types/index.js';
import { nanoid } from 'nanoid';

export abstract class BaseService {
  constructor(
    protected readonly logger: ILogger,
    protected readonly eventBus: IEventBus,
  ) {}

  protected async emitEvent(
    event: DomainEvent,
    aggregateId: string,
    aggregateType: string,
    data: Record<string, unknown>,
    metadata?: DomainEventPayload['metadata'],
  ): Promise<void> {
    const payload: DomainEventPayload = {
      eventId: nanoid(),
      event,
      occurredAt: new Date(),
      aggregateId,
      aggregateType,
      data,
      metadata,
    };

    this.logger.debug({ event, aggregateId }, 'Emitting domain event');
    await this.eventBus.emit(payload);
  }

  protected wrapError(
    error: unknown,
    code: ErrorCode = ErrorCode.INTERNAL,
    message?: string,
  ): AppError {
    if (error && typeof error === 'object' && 'code' in error) {
      return error as AppError;
    }

    const errObj = error instanceof Error ? error : new Error(String(error));
    return createError(
      code,
      message ?? errObj.message,
      undefined,
      errObj,
    );
  }

  protected handleResult<T>(
    operation: string,
    result: Result<T>,
  ): Result<T> {
    if (!result.success) {
      this.logger.error(
        { error: result.error, operation },
        result.error.message,
      );
    }
    return result;
  }

  protected success<T>(data: T): Result<T> {
    return ok(data);
  }

  protected failure(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ): Result<never> {
    return err(createError(code, message, details));
  }

  protected parseId(raw: string): string | null {
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.length > 128) return null;
    return trimmed;
  }
}
