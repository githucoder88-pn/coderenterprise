/**
 * Service Registry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceRegistry } from '../../../cluster/registry/service-registry.js';
import { createMockLogger } from '../../helpers.js';

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;

  beforeEach(() => { registry = new ServiceRegistry(createMockLogger()); });

  const registerTestService = (id = 'svc-1', name = 'coder-api') => {
    registry.register({ id, name, version: '1.0.0', host: 'localhost', port: 3000, protocol: 'http', healthPath: '/health', tags: ['api'], metadata: {} });
  };

  describe('register', () => {
    it('should register a service', () => {
      registerTestService();
      expect(registry.get('coder-api').length).toBe(1);
    });
  });

  describe('deregister', () => {
    it('should remove a service', () => {
      registerTestService();
      registry.deregister('svc-1');
      expect(registry.get('coder-api').length).toBe(0);
    });
  });

  describe('getHealthy', () => {
    it('should return only healthy services', () => {
      registerTestService('svc-1', 'api');
      registerTestService('svc-2', 'api');
      registry.healthCheck('svc-2', false);
      expect(registry.getHealthy('api').length).toBe(1);
    });
  });

  describe('healthCheck', () => {
    it('should update health status', () => {
      registerTestService();
      registry.healthCheck('svc-1', false);
      expect(registry.getById('svc-1')!.healthy).toBe(false);
      registry.healthCheck('svc-1', true);
      expect(registry.getById('svc-1')!.healthy).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return accurate stats', () => {
      registerTestService('svc-1', 'api');
      registerTestService('svc-2', 'api');
      registerTestService('svc-3', 'worker');
      const stats = registry.getStats();
      expect(stats.total).toBe(3);
      expect(stats.healthy).toBe(3);
      expect(stats.byName['api']).toBe(2);
    });
  });
});
