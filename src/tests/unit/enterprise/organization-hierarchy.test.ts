/**
 * Organization Hierarchy Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OrganizationHierarchy } from '../../../enterprise/organizations/organization-hierarchy.js';
import { createMockLogger } from '../../helpers.js';

describe('OrganizationHierarchy', () => {
  let hierarchy: OrganizationHierarchy;

  beforeEach(() => { hierarchy = new OrganizationHierarchy(createMockLogger()); });

  describe('organizations', () => {
    it('should create an organization', async () => {
      const result = await hierarchy.createOrganization('Acme Corp', 'acme', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Acme Corp');
        expect(result.data.memberCount).toBe(1);
      }
    });

    it('should reject duplicate slugs', async () => {
      await hierarchy.createOrganization('A', 'acme', 'u1');
      const result = await hierarchy.createOrganization('B', 'acme', 'u2');
      expect(result.success).toBe(false);
    });

    it('should find by slug', async () => {
      await hierarchy.createOrganization('Test', 'test-org', 'u1');
      expect(await hierarchy.getBySlug('test-org')).not.toBeNull();
    });

    it('should suspend and reactivate', async () => {
      const org = (await hierarchy.createOrganization('Test', 'test', 'u1')).data!;
      await hierarchy.suspendOrganization(org.id);
      expect((await hierarchy.getOrganization(org.id))!.status).toBe('suspended');
      await hierarchy.reactivateOrganization(org.id);
      expect((await hierarchy.getOrganization(org.id))!.status).toBe('active');
    });
  });

  describe('departments', () => {
    it('should create a department', async () => {
      const org = (await hierarchy.createOrganization('Test', 'test', 'u1')).data!;
      const result = await hierarchy.createDepartment(org.id, 'Engineering', 'Software engineering');
      expect(result.success).toBe(true);
    });

    it('should list departments by org', async () => {
      const org = (await hierarchy.createOrganization('Test', 'test', 'u1')).data!;
      await hierarchy.createDepartment(org.id, 'Eng', '');
      await hierarchy.createDepartment(org.id, 'Design', '');
      expect((await hierarchy.getDepartments(org.id)).length).toBe(2);
    });
  });

  describe('teams', () => {
    it('should create a team', async () => {
      const org = (await hierarchy.createOrganization('Test', 'test', 'u1')).data!;
      const result = await hierarchy.createTeam(org.id, 'Backend', 'Backend team');
      expect(result.success).toBe(true);
    });

    it('should list teams by org', async () => {
      const org = (await hierarchy.createOrganization('Test', 'test', 'u1')).data!;
      await hierarchy.createTeam(org.id, 'A', '');
      await hierarchy.createTeam(org.id, 'B', '');
      expect((await hierarchy.getTeams(org.id)).length).toBe(2);
    });
  });

  describe('members', () => {
    it('should add a member', async () => {
      const org = (await hierarchy.createOrganization('Test', 'test', 'owner-1')).data!;
      const result = await hierarchy.addMember(org.id, 'user-2', 'developer');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.role).toBe('developer');
    });

    it('should update member role', async () => {
      const org = (await hierarchy.createOrganization('Test', 'test', 'u1')).data!;
      await hierarchy.addMember(org.id, 'user-2', 'developer');
      const result = await hierarchy.updateMemberRole(org.id, 'user-2', 'manager');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.role).toBe('manager');
    });

    it('should remove a member', async () => {
      const org = (await hierarchy.createOrganization('Test', 'test', 'u1')).data!;
      await hierarchy.addMember(org.id, 'user-2', 'developer');
      const result = await hierarchy.removeMember(org.id, 'user-2');
      expect(result.success).toBe(true);
    });

    it('should not remove the owner', async () => {
      const org = (await hierarchy.createOrganization('Test', 'test', 'u1')).data!;
      const result = await hierarchy.removeMember(org.id, 'u1');
      expect(result.success).toBe(false);
    });

    it('should check permissions', async () => {
      const org = (await hierarchy.createOrganization('Test', 'test', 'u1')).data!;
      await hierarchy.addMember(org.id, 'dev-1', 'developer');
      await hierarchy.addMember(org.id, 'viewer-1', 'viewer');

      expect(await hierarchy.checkPermission('u1', org.id, 'org:write')).toBe(true); // owner
      expect(await hierarchy.checkPermission('dev-1', org.id, 'workspace:create')).toBe(true);
      expect(await hierarchy.checkPermission('viewer-1', org.id, 'workspace:create')).toBe(false);
    });
  });

  describe('projects', () => {
    it('should create a project', async () => {
      const org = (await hierarchy.createOrganization('Test', 'test', 'u1')).data!;
      const result = await hierarchy.createProject(org.id, 'My Project', 'A project');
      expect(result.success).toBe(true);
    });
  });
});
