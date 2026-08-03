/**
 * Audit Service
 *
 * Immutable audit log trail for compliance and debugging.
 */

import { BaseService } from '../../core/base-service.js';
import type { AuditRepository } from './audit.repository.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type { AuditLog, AuditLogInput } from './audit.types.js';
import {
  ErrorCode,
  type Result,
  type PaginationParams,
  type PaginatedResponse,
} from '../../types/index.js';

export interface IAuditService {
  log(input: AuditLogInput): Promise<Result<AuditLog>>;
  getById(id: string): Promise<Result<AuditLog>>;
  listByActor(actorId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<AuditLog>>>;
  listByTarget(targetId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<AuditLog>>>;
  listByOrganization(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<AuditLog>>>;
  listAll(pagination: PaginationParams): Promise<Result<PaginatedResponse<AuditLog>>>;
}

export class AuditService extends BaseService implements IAuditService {
  constructor(
    private readonly auditRepo: AuditRepository,
    logger: ILogger,
    eventBus: IEventBus,
  ) {
    super(logger, eventBus);
  }

  async log(input: AuditLogInput): Promise<Result<AuditLog>> {
    try {
      const auditLog = await this.auditRepo.create({
        action: input.action,
        actorId: input.actorId,
        targetId: input.targetId,
        targetType: input.targetType,
        data: input.data,
        ip: input.ip,
        userAgent: input.userAgent,
        organizationId: input.organizationId,
      });

      this.logger.info(
        { auditId: auditLog.id, action: input.action, actorId: input.actorId },
        'Audit log created',
      );

      return this.success(auditLog);
    } catch (error) {
      this.logger.error({ error, input }, 'Failed to create audit log');
      return this.wrapError(error, ErrorCode.INTERNAL, 'Failed to create audit log') as unknown as Result<AuditLog>;
    }
  }

  async getById(id: string): Promise<Result<AuditLog>> {
    const log = await this.auditRepo.findById(id);
    if (!log) return this.failure(ErrorCode.NOT_FOUND, `Audit log ${id} not found`);
    return this.success(log);
  }

  async listByActor(
    actorId: string,
    pagination: PaginationParams,
  ): Promise<Result<PaginatedResponse<AuditLog>>> {
    const result = await this.auditRepo.findByActor(actorId, pagination);
    return this.success(result);
  }

  async listByTarget(
    targetId: string,
    pagination: PaginationParams,
  ): Promise<Result<PaginatedResponse<AuditLog>>> {
    const result = await this.auditRepo.findByTarget(targetId, pagination);
    return this.success(result);
  }

  async listByOrganization(
    orgId: string,
    pagination: PaginationParams,
  ): Promise<Result<PaginatedResponse<AuditLog>>> {
    const result = await this.auditRepo.findByOrganization(orgId, pagination);
    return this.success(result);
  }

  async listAll(
    pagination: PaginationParams,
  ): Promise<Result<PaginatedResponse<AuditLog>>> {
    const result = await this.auditRepo.findPaginated([], pagination);
    return this.success(result);
  }
}
