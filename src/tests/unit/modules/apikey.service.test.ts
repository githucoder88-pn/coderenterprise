/**
 * API Key Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiKeyService } from '../../../modules/apikeys/apikey.service.js';
import { createMockLogger, createMockEventBus, createMockUser } from '../../helpers.js';
import { RBACService } from '../../../modules/rbac/rbac.service.js';
import { AuditService } from '../../../modules/audit/audit.service.js';
import { ErrorCode } from '../../../types/index.js';
import type { ApiKeyRepository } from '../../../modules/apikeys/apikey.repository.js';

function createMockApiKeyRepo(): ApiKeyRepository {
  const store = new Map<string, any>();
  return {
    findById: vi.fn(async (id: string) => store.get(id) ?? null),
    findByIds: vi.fn(async (ids: readonly string[]) => ids.map((id) => store.get(id)).filter(Boolean)),
    findAll: vi.fn(async () => [...store.values()]),
    findWhere: vi.fn(async (filters: readonly any[]) => {
      return [...store.values()].filter((item) =>
        filters.every((f: any) => {
          if (f.operator === '==') return item[f.field] === f.value;
          if (f.operator === '!=') return item[f.field] !== f.value;
          return true;
        }),
      );
    }),
    findPaginated: vi.fn(async () => ({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
    })),
    create: vi.fn(async (entity: any) => {
      const id = entity.id ?? `key-${store.size + 1}`;
      const key = { ...entity, id, createdAt: new Date(), updatedAt: new Date() };
      store.set(id, key);
      return key;
    }),
    update: vi.fn(async (id: string, data: any) => {
      const existing = store.get(id);
      if (existing) {
        const updated = { ...existing, ...data, updatedAt: new Date() };
        store.set(id, updated);
        return updated;
      }
      throw new Error('Not found');
    }),
    delete: vi.fn(async (id: string) => { store.delete(id); }),
    count: vi.fn(async () => store.size),
    exists: vi.fn(async (id: string) => store.has(id)),
    findByHashedKey: vi.fn(async () => null),
    findByOrganization: vi.fn(async () => []),
  } as unknown as ApiKeyRepository;
}

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let repo: ApiKeyRepository;
  let rbac: RBACService;
  let audit: AuditService;

  beforeEach(() => {
    repo = createMockApiKeyRepo();
    const logger = createMockLogger();
    const eventBus = createMockEventBus();
    rbac = new RBACService(logger, eventBus);
    audit = new AuditService({} as any, logger, eventBus);
    service = new ApiKeyService(repo, rbac, audit, logger, eventBus);
  });

  describe('create', () => {
    it('should create an API key', async () => {
      const actor = createMockUser();
      const result = await service.create({
        name: 'My API Key',
        organizationId: 'org-1',
      }, actor);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rawKey).toMatch(/^ce_/);
        expect(result.data.apiKey.name).toBe('My API Key');
        expect(result.data.apiKey.keyPrefix).toBeDefined();
      }
    });

    it('should reject empty name', async () => {
      const actor = createMockUser();
      const result = await service.create({
        name: '',
        organizationId: 'org-1',
      }, actor);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCode.VALIDATION);
      }
    });
  });

  describe('validateKey', () => {
    it('should fail for unknown key', async () => {
      const result = await service.validateKey('ce_unknown_key_here');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCode.AUTH_TOKEN_INVALID);
      }
    });
  });
});
