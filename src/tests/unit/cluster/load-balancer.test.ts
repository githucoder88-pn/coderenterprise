/**
 * Load Balancer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LoadBalancer } from '../../../cluster/scheduler/load-balancer.js';
import { createMockLogger } from '../../helpers.js';
import type { ClusterNode } from '../../../cluster/types.js';

function makeNode(id: string, overrides?: Partial<ClusterNode>): ClusterNode {
  return {
    id, hostname: `node-${id}`, ip: '10.0.0.1', port: 3000, status: 'healthy',
    role: 'worker', workers: [],
    cpu: { cores: 4, usage: 50 }, memory: { total: 8192, used: 4096, percent: 50 },
    load: { m1: 1, m5: 1, m15: 1 }, lastHeartbeat: new Date(),
    metadata: {}, createdAt: new Date(), updatedAt: new Date(), ...overrides,
  };
}

describe('LoadBalancer', () => {
  const nodes: ClusterNode[] = [makeNode('a'), makeNode('b'), makeNode('c')];

  describe('round-robin', () => {
    it('should cycle through nodes', () => {
      const lb = new LoadBalancer({ strategy: 'round-robin', healthCheckIntervalMs: 10000, unhealthyThreshold: 3, healthyThreshold: 2 }, createMockLogger());
      const results = [lb.select(nodes)!.id, lb.select(nodes)!.id, lb.select(nodes)!.id, lb.select(nodes)!.id];
      expect(results).toEqual(['a', 'b', 'c', 'a']);
    });
  });

  describe('weighted', () => {
    it('should respect weights', () => {
      const lb = new LoadBalancer({ strategy: 'weighted', healthCheckIntervalMs: 10000, unhealthyThreshold: 3, healthyThreshold: 2, weights: { a: 10, b: 0, c: 0 } }, createMockLogger());
      const results = new Set(Array.from({ length: 50 }, () => lb.select(nodes)!.id));
      expect(results.has('a')).toBe(true);
    });
  });

  describe('least-connections', () => {
    it('should prefer nodes with fewer connections', () => {
      const lb = new LoadBalancer({ strategy: 'least-connections', healthCheckIntervalMs: 10000, unhealthyThreshold: 3, healthyThreshold: 2 }, createMockLogger());
      lb.recordRequest('a', 100);
      lb.recordRequest('a', 100);
      lb.recordRequest('b', 100);
      const selected = lb.select(nodes);
      expect(selected!.id).toBe('c'); // No connections yet
    });
  });

  describe('failover', () => {
    it('should return first healthy node', () => {
      const lb = new LoadBalancer({ strategy: 'failover', healthCheckIntervalMs: 10000, unhealthyThreshold: 3, healthyThreshold: 2 }, createMockLogger());
      expect(lb.select(nodes)!.id).toBe('a');
    });
  });

  describe('health management', () => {
    it('should exclude unhealthy nodes', () => {
      const lb = new LoadBalancer({ strategy: 'round-robin', healthCheckIntervalMs: 10000, unhealthyThreshold: 1, healthyThreshold: 1 }, createMockLogger());
      lb.markUnhealthy('a');
      const selected = lb.select(nodes);
      expect(selected!.id).not.toBe('a');
    });

    it('should reinclude recovered nodes', () => {
      const lb = new LoadBalancer({ strategy: 'round-robin', healthCheckIntervalMs: 10000, unhealthyThreshold: 1, healthyThreshold: 1 }, createMockLogger());
      lb.markUnhealthy('a');
      lb.markHealthy('a');
      const results = new Set(Array.from({ length: 3 }, () => lb.select(nodes)!.id));
      expect(results.has('a')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should return null for empty nodes', () => {
      const lb = new LoadBalancer({ strategy: 'round-robin', healthCheckIntervalMs: 10000, unhealthyThreshold: 3, healthyThreshold: 2 }, createMockLogger());
      expect(lb.select([])).toBeNull();
    });

    it('should return single node', () => {
      const lb = new LoadBalancer({ strategy: 'round-robin', healthCheckIntervalMs: 10000, unhealthyThreshold: 3, healthyThreshold: 2 }, createMockLogger());
      expect(lb.select([nodes[0]!])!.id).toBe('a');
    });
  });
});
