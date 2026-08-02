/**
 * Base Repository
 *
 * Abstract repository with CRUD operations.
 * Concrete implementations per collection/table.
 */

import type { Timestamps, PaginationParams, PaginatedResponse } from '../types/index.js';

export interface FindOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly orderBy?: string;
  readonly orderDirection?: 'asc' | 'desc';
}

export interface QueryFilter {
  readonly field: string;
  readonly operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains' | 'array-contains-any';
  readonly value: unknown;
}

export interface IRepository<T extends { id: string } & Timestamps> {
  findById(id: string): Promise<T | null>;
  findByIds(ids: readonly string[]): Promise<readonly T[]>;
  findAll(options?: FindOptions): Promise<readonly T[]>;
  findWhere(filters: readonly QueryFilter[], options?: FindOptions): Promise<readonly T[]>;
  findPaginated(
    filters: readonly QueryFilter[],
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<T>>;
  create(entity: Omit<T, keyof Timestamps | 'id'> & { id?: string }): Promise<T>;
  update(id: string, data: Partial<Omit<T, 'id' | keyof Timestamps>>): Promise<T>;
  delete(id: string): Promise<void>;
  count(filters?: readonly QueryFilter[]): Promise<number>;
  exists(id: string): Promise<boolean>;
}

export abstract class BaseRepository<T extends { id: string } & Timestamps>
  implements IRepository<T>
{
  abstract findById(id: string): Promise<T | null>;
  abstract findByIds(ids: readonly string[]): Promise<readonly T[]>;
  abstract findAll(options?: FindOptions): Promise<readonly T[]>;
  abstract findWhere(
    filters: readonly QueryFilter[],
    options?: FindOptions,
  ): Promise<readonly T[]>;
  abstract findPaginated(
    filters: readonly QueryFilter[],
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<T>>;
  abstract create(
    entity: Omit<T, keyof Timestamps | 'id'> & { id?: string },
  ): Promise<T>;
  abstract update(
    id: string,
    data: Partial<Omit<T, 'id' | keyof Timestamps>>,
  ): Promise<T>;
  abstract delete(id: string): Promise<void>;
  abstract count(filters?: readonly QueryFilter[]): Promise<number>;
  abstract exists(id: string): Promise<boolean>;
}
