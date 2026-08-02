/**
 * Model Registry Service
 */

import { BaseService } from '../../core/base-service.js';
import type { ModelRepository } from './model.repository.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type { Model, RegisterModelInput, UpdateModelInput } from './model.types.js';
import { RegisterModelSchema, UpdateModelSchema } from './model.types.js';
import { ErrorCode, type Result, type PaginationParams, type PaginatedResponse } from '../../types/index.js';

export interface IModelRegistryService {
  getById(id: string): Promise<Result<Model>>;
  getByModelId(modelId: string): Promise<Result<Model>>;
  register(input: RegisterModelInput): Promise<Result<Model>>;
  update(id: string, input: UpdateModelInput): Promise<Result<Model>>;
  deprecate(id: string): Promise<Result<Model>>;
  remove(id: string): Promise<Result<void>>;
  listActive(pagination: PaginationParams): Promise<Result<PaginatedResponse<Model>>>;
  listByProvider(provider: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Model>>>;
  listByCapability(capability: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Model>>>;
  search(query: string): Promise<Result<readonly Model[]>>;
  getComparison(modelIds: readonly string[]): Promise<Result<readonly Model[]>>;
}

export class ModelRegistryService extends BaseService implements IModelRegistryService {
  constructor(private readonly repo: ModelRepository, logger: ILogger, eventBus: IEventBus) {
    super(logger, eventBus);
  }

  async getById(id: string): Promise<Result<Model>> {
    const model = await this.repo.findById(id);
    return model ? this.success(model) : this.failure(ErrorCode.NOT_FOUND, `Model ${id} not found`);
  }

  async getByModelId(modelId: string): Promise<Result<Model>> {
    const model = await this.repo.findByModelId(modelId);
    return model ? this.success(model) : this.failure(ErrorCode.NOT_FOUND, `Model ${modelId} not found`);
  }

  async register(input: RegisterModelInput): Promise<Result<Model>> {
    const parsed = RegisterModelSchema.safeParse(input);
    if (!parsed.success) return this.failure(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const existing = await this.repo.findByModelId(parsed.data.modelId);
    if (existing) return this.failure(ErrorCode.CONFLICT, `Model ${parsed.data.modelId} already registered`);
    const model = await this.repo.create({ ...parsed.data, status: 'active', pricing: parsed.data.pricing ? { ...parsed.data.pricing, currency: parsed.data.pricing.currency ?? 'USD' } : null });
    return this.success(model);
  }

  async update(id: string, input: UpdateModelInput): Promise<Result<Model>> {
    const parsed = UpdateModelSchema.safeParse(input);
    if (!parsed.success) return this.failure(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const existing = await this.repo.findById(id);
    if (!existing) return this.failure(ErrorCode.NOT_FOUND, `Model ${id} not found`);
    return this.success(await this.repo.update(id, parsed.data));
  }

  async deprecate(id: string): Promise<Result<Model>> {
    const existing = await this.repo.findById(id);
    if (!existing) return this.failure(ErrorCode.NOT_FOUND, `Model ${id} not found`);
    return this.success(await this.repo.update(id, { deprecated: true, status: 'deprecated' }));
  }

  async remove(id: string): Promise<Result<void>> {
    await this.repo.delete(id);
    return this.success(undefined);
  }

  async listActive(pagination: PaginationParams): Promise<Result<PaginatedResponse<Model>>> {
    return this.success(await this.repo.findPaginated([{ field: 'status', operator: '==', value: 'active' }], pagination));
  }

  async listByProvider(provider: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Model>>> {
    return this.success(await this.repo.findPaginated([{ field: 'provider', operator: '==', value: provider }], pagination));
  }

  async listByCapability(capability: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Model>>> {
    return this.success(await this.repo.findPaginated([{ field: `capabilities.${capability}`, operator: '==', value: true }], pagination));
  }

  async search(query: string): Promise<Result<readonly Model[]>> {
    const all = await this.repo.findActive();
    const q = query.toLowerCase();
    return this.success(all.filter((m) =>
      m.modelId.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q) ||
      m.provider.toLowerCase().includes(q) || m.tags.some((t) => t.toLowerCase().includes(q)),
    ));
  }

  async getComparison(modelIds: readonly string[]): Promise<Result<readonly Model[]>> {
    const models = await this.repo.findByIds(modelIds);
    return this.success(models);
  }
}
