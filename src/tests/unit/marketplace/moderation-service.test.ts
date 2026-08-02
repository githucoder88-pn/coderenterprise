/**
 * Moderation Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModerationService } from '../../../marketplace/moderation/moderation-service.js';
import { createMockLogger } from '../../helpers.js';

describe('ModerationService', () => {
  let service: ModerationService;

  beforeEach(() => { service = new ModerationService(createMockLogger()); });

  describe('approve', () => {
    it('should approve a package', async () => {
      const result = await service.approve('pkg-1', 'mod-1', 'Looks good');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.action).toBe('approve');
    });

    it('should record in history', async () => {
      await service.approve('pkg-1', 'mod-1');
      const history = await service.getHistory('pkg-1');
      expect(history.length).toBe(1);
    });
  });

  describe('reject', () => {
    it('should reject a package', async () => {
      const result = await service.reject('pkg-1', 'mod-1', 'Malware detected');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.action).toBe('reject');
    });
  });

  describe('suspend / restore', () => {
    it('should suspend and restore', async () => {
      await service.suspend('pkg-1', 'mod-1', 'Policy violation');
      await service.restore('pkg-1', 'mod-1');
      const history = await service.getHistory('pkg-1');
      expect(history.length).toBe(2);
      expect(history[0]!.action).toBe('suspend');
      expect(history[1]!.action).toBe('restore');
    });
  });

  describe('securityScan', () => {
    it('should run a security scan', async () => {
      const result = await service.runSecurityScan('pkg-1', '1.0.0');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.passed).toBe(true);
        expect(result.data.score).toBe(100);
      }
    });
  });

  describe('getStats', () => {
    it('should return moderation stats', async () => {
      await service.approve('pkg-1', 'mod-1');
      await service.reject('pkg-2', 'mod-1', 'Spam');
      const stats = await service.getStats();
      expect(stats.approved).toBe(1);
      expect(stats.rejected).toBe(1);
    });
  });
});
