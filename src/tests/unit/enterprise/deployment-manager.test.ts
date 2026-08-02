/**
 * Deployment Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeploymentManager } from '../../../enterprise/deployments/deployment-manager.js';
import { createMockLogger } from '../../helpers.js';

describe('DeploymentManager', () => {
  let manager: DeploymentManager;

  beforeEach(() => { manager = new DeploymentManager(createMockLogger()); });

  describe('create', () => {
    it('should create a deployment', async () => {
      const result = await manager.create('org-1', 'proj-1', 'production', '1.0.0', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('pending');
        expect(result.data.version).toBe('1.0.0');
      }
    });
  });

  describe('deploy', () => {
    it('should deploy successfully', async () => {
      const deployment = (await manager.create('org-1', 'proj-1', 'staging', '1.0.0', 'user-1')).data!;
      const result = await manager.deploy(deployment.id);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('deployed');
        expect(result.data.deployedAt).toBeDefined();
      }
    });
  });

  describe('rollback', () => {
    it('should rollback to previous version', async () => {
      const v1 = (await manager.create('org-1', 'proj-1', 'production', '1.0.0', 'user-1')).data!;
      await manager.deploy(v1.id);
      const v2 = (await manager.create('org-1', 'proj-1', 'production', '2.0.0', 'user-1')).data!;
      await manager.deploy(v2.id);
      const result = await manager.rollback(v2.id);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('rolled_back');
        expect(result.data.rollbackVersion).toBe('1.0.0');
      }
    });

    it('should fail without previous deployment', async () => {
      const deployment = (await manager.create('org-1', 'proj-1', 'production', '1.0.0', 'user-1')).data!;
      const result = await manager.rollback(deployment.id);
      expect(result.success).toBe(false);
    });
  });

  describe('list', () => {
    it('should list deployments by org', async () => {
      await manager.create('org-1', 'proj-1', 'staging', '1.0.0', 'u1');
      await manager.create('org-1', 'proj-2', 'production', '1.0.0', 'u1');
      await manager.create('org-2', 'proj-3', 'staging', '1.0.0', 'u2');
      expect((await manager.list('org-1')).length).toBe(2);
    });

    it('should filter by project', async () => {
      await manager.create('org-1', 'proj-1', 'staging', '1.0.0', 'u1');
      await manager.create('org-1', 'proj-2', 'staging', '1.0.0', 'u1');
      expect((await manager.list('org-1', 'proj-1')).length).toBe(1);
    });
  });
});
