/**
 * Publisher Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PublisherService } from '../../../marketplace/publishers/publisher-service.js';
import { createMockLogger } from '../../helpers.js';

describe('PublisherService', () => {
  let service: PublisherService;

  beforeEach(() => { service = new PublisherService(createMockLogger()); });

  describe('create', () => {
    it('should create a publisher', async () => {
      const result = await service.create('user-1', 'Acme Corp', 'acme', 'acme@example.com');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Acme Corp');
        expect(result.data.verified).toBe(false);
      }
    });

    it('should reject duplicates', async () => {
      await service.create('user-1', 'A', 'a', 'a@x.com');
      const result = await service.create('user-1', 'B', 'b', 'b@x.com');
      expect(result.success).toBe(false);
    });
  });

  describe('verify', () => {
    it('should verify a publisher', async () => {
      const pub = (await service.create('user-1', 'Test', 'test', 't@x.com')).data!;
      const result = await service.verify(pub.id);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.verified).toBe(true);
    });
  });

  describe('search', () => {
    it('should search publishers', async () => {
      await service.create('u1', 'Acme Corp', 'acme', 'a@x.com');
      await service.create('u2', 'Beta Inc', 'beta', 'b@x.com');
      const results = await service.search('acme');
      expect(results.length).toBe(1);
    });
  });

  describe('updateStats', () => {
    it('should update publisher stats', async () => {
      const pub = (await service.create('u1', 'Test', 'test', 't@x.com')).data!;
      await service.updateStats(pub.id, { packageCount: 5, totalDownloads: 1000 });
      const updated = await service.getById(pub.id);
      expect(updated!.packageCount).toBe(5);
      expect(updated!.totalDownloads).toBe(1000);
    });
  });
});
