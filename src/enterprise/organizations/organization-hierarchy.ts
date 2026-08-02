/**
 * Organization Hierarchy Service
 *
 * Manages the full enterprise hierarchy: Organization → Department → Team → Member
 */

import type {
  Organization, OrganizationSettings, Department, Team, Member, Project,
  EnterpriseRole, RoleDefinition, DEFAULT_ROLE_PERMISSIONS,
} from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result, type PaginationParams, type PaginatedResponse } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export interface IOrganizationHierarchy {
  createOrganization(name: string, slug: string, ownerId: string, plan?: string): Promise<Result<Organization>>;
  getOrganization(id: string): Promise<Organization | null>;
  getBySlug(slug: string): Promise<Organization | null>;
  updateOrganization(id: string, updates: Partial<Organization>): Promise<Result<Organization>>;
  suspendOrganization(id: string): Promise<Result<void>>;
  reactivateOrganization(id: string): Promise<Result<void>>;

  createDepartment(orgId: string, name: string, description: string): Promise<Result<Department>>;
  getDepartments(orgId: string): Promise<readonly Department[]>;
  updateDepartment(id: string, updates: Partial<Department>): Promise<Result<Department>>;

  createTeam(orgId: string, name: string, description: string, departmentId?: string): Promise<Result<Team>>;
  getTeams(orgId: string, departmentId?: string): Promise<readonly Team[]>;
  updateTeam(id: string, updates: Partial<Team>): Promise<Result<Team>>;
  deleteTeam(id: string): Promise<Result<void>>;

  addMember(orgId: string, userId: string, role: EnterpriseRole, teamIds?: readonly string[]): Promise<Result<Member>>;
  removeMember(orgId: string, userId: string): Promise<Result<void>>;
  updateMemberRole(orgId: string, userId: string, role: EnterpriseRole): Promise<Result<Member>>;
  getMembers(orgId: string, pagination: PaginationParams): Promise<PaginatedResponse<Member>>;
  getMember(orgId: string, userId: string): Promise<Member | null>;
  checkPermission(userId: string, orgId: string, permission: string): Promise<boolean>;

  createProject(orgId: string, name: string, description: string, teamId?: string): Promise<Result<Project>>;
  getProjects(orgId: string, pagination: PaginationParams): Promise<PaginatedResponse<Project>>;
}

export class OrganizationHierarchy implements IOrganizationHierarchy {
  private readonly orgs = new Map<string, Organization>();
  private readonly departments = new Map<string, Department>();
  private readonly teams = new Map<string, Team>();
  private readonly members = new Map<string, Member>();
  private readonly projects = new Map<string, Project>();

  constructor(private readonly logger: ILogger) {}

  async createOrganization(name: string, slug: string, ownerId: string, plan = 'free'): Promise<Result<Organization>> {
    const existing = [...this.orgs.values()].find((o) => o.slug === slug);
    if (existing) return { success: false, error: { code: ErrorCode.CONFLICT, message: `Slug '${slug}' already exists`, timestamp: new Date() } };

    const now = new Date();
    const settings: OrganizationSettings = {
      ssoEnabled: false, mfaRequired: false, allowedDomains: [],
      sessionTimeoutMs: 3600000, maxMembers: 100, dataRetentionDays: 365,
      defaultRole: 'developer', ipWhitelist: [], features: {},
    };

    const org: Organization = {
      id: crypto.randomUUID(), name, slug, plan: plan as any,
      status: 'active', ownerId, domain: null, logoUrl: null,
      settings, memberCount: 1, departmentCount: 0, metadata: {},
      createdAt: now, updatedAt: now,
    };

    this.orgs.set(org.id, org);
    await this.addMember(org.id, ownerId, 'owner');
    this.logger.info({ orgId: org.id, name, slug }, 'Organization created');
    return { success: true, data: org };
  }

  async getOrganization(id: string): Promise<Organization | null> { return this.orgs.get(id) ?? null; }
  async getBySlug(slug: string): Promise<Organization | null> {
    return [...this.orgs.values()].find((o) => o.slug === slug) ?? null;
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Result<Organization>> {
    const org = this.orgs.get(id);
    if (!org) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Organization not found', timestamp: new Date() } };
    const updated = { ...org, ...updates, updatedAt: new Date() };
    this.orgs.set(id, updated);
    return { success: true, data: updated };
  }

  async suspendOrganization(id: string): Promise<Result<void>> {
    const org = this.orgs.get(id);
    if (!org) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Organization not found', timestamp: new Date() } };
    this.orgs.set(id, { ...org, status: 'suspended', updatedAt: new Date() });
    return { success: true, data: undefined };
  }

  async reactivateOrganization(id: string): Promise<Result<void>> {
    const org = this.orgs.get(id);
    if (!org) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Organization not found', timestamp: new Date() } };
    this.orgs.set(id, { ...org, status: 'active', updatedAt: new Date() });
    return { success: true, data: undefined };
  }

  async createDepartment(orgId: string, name: string, description: string): Promise<Result<Department>> {
    const org = this.orgs.get(orgId);
    if (!org) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Organization not found', timestamp: new Date() } };
    const now = new Date();
    const dept: Department = {
      id: crypto.randomUUID(), organizationId: orgId, name, description,
      leadUserId: null, teamCount: 0, budget: null, metadata: {},
      createdAt: now, updatedAt: now,
    };
    this.departments.set(dept.id, dept);
    this.orgs.set(orgId, { ...org, departmentCount: org.departmentCount + 1, updatedAt: new Date() });
    return { success: true, data: dept };
  }

  async getDepartments(orgId: string): Promise<readonly Department[]> {
    return [...this.departments.values()].filter((d) => d.organizationId === orgId);
  }

  async updateDepartment(id: string, updates: Partial<Department>): Promise<Result<Department>> {
    const dept = this.departments.get(id);
    if (!dept) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Department not found', timestamp: new Date() } };
    const updated = { ...dept, ...updates, updatedAt: new Date() };
    this.departments.set(id, updated);
    return { success: true, data: updated };
  }

  async createTeam(orgId: string, name: string, description: string, departmentId?: string): Promise<Result<Team>> {
    const now = new Date();
    const team: Team = {
      id: crypto.randomUUID(), organizationId: orgId, departmentId: departmentId ?? null,
      name, description, leadUserId: null, memberCount: 0, permissions: [], metadata: {},
      createdAt: now, updatedAt: now,
    };
    this.teams.set(team.id, team);
    if (departmentId) {
      const dept = this.departments.get(departmentId);
      if (dept) this.departments.set(departmentId, { ...dept, teamCount: dept.teamCount + 1 });
    }
    return { success: true, data: team };
  }

  async getTeams(orgId: string, departmentId?: string): Promise<readonly Team[]> {
    return [...this.teams.values()].filter((t) =>
      t.organizationId === orgId && (!departmentId || t.departmentId === departmentId),
    );
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Result<Team>> {
    const team = this.teams.get(id);
    if (!team) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Team not found', timestamp: new Date() } };
    const updated = { ...team, ...updates, updatedAt: new Date() };
    this.teams.set(id, updated);
    return { success: true, data: updated };
  }

  async deleteTeam(id: string): Promise<Result<void>> {
    this.teams.delete(id);
    return { success: true, data: undefined };
  }

  async addMember(orgId: string, userId: string, role: EnterpriseRole, teamIds: readonly string[] = []): Promise<Result<Member>> {
    const now = new Date();
    const member: Member = {
      id: crypto.randomUUID(), userId, organizationId: orgId, role,
      departmentId: null, teamIds, status: 'active',
      invitedAt: null, joinedAt: now, metadata: {},
      createdAt: now, updatedAt: now,
    };
    this.members.set(member.id, member);
    const org = this.orgs.get(orgId);
    if (org) this.orgs.set(orgId, { ...org, memberCount: org.memberCount + 1, updatedAt: new Date() });
    this.logger.info({ orgId, userId, role }, 'Member added');
    return { success: true, data: member };
  }

  async removeMember(orgId: string, userId: string): Promise<Result<void>> {
    const member = [...this.members.values()].find((m) => m.organizationId === orgId && m.userId === userId);
    if (!member) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Member not found', timestamp: new Date() } };
    if (member.role === 'owner') return { success: false, error: { code: ErrorCode.FORBIDDEN, message: 'Cannot remove owner', timestamp: new Date() } };
    this.members.delete(member.id);
    return { success: true, data: undefined };
  }

  async updateMemberRole(orgId: string, userId: string, role: EnterpriseRole): Promise<Result<Member>> {
    const member = [...this.members.values()].find((m) => m.organizationId === orgId && m.userId === userId);
    if (!member) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Member not found', timestamp: new Date() } };
    const updated = { ...member, role, updatedAt: new Date() };
    this.members.set(member.id, updated);
    return { success: true, data: updated };
  }

  async getMembers(orgId: string, pagination: PaginationParams): Promise<PaginatedResponse<Member>> {
    const all = [...this.members.values()].filter((m) => m.organizationId === orgId);
    const start = (pagination.page - 1) * pagination.limit;
    return createPaginatedResponse(all.slice(start, start + pagination.limit), all.length, pagination);
  }

  async getMember(orgId: string, userId: string): Promise<Member | null> {
    return [...this.members.values()].find((m) => m.organizationId === orgId && m.userId === userId) ?? null;
  }

  async checkPermission(userId: string, orgId: string, permission: string): Promise<boolean> {
    const member = await this.getMember(orgId, userId);
    if (!member) return false;
    const perms = this.getRolePermissions(member.role);
    return perms.includes('*') || perms.includes(permission);
  }

  async createProject(orgId: string, name: string, description: string, teamId?: string): Promise<Result<Project>> {
    const now = new Date();
    const project: Project = {
      id: crypto.randomUUID(), organizationId: orgId,
      departmentId: null, teamId: teamId ?? null,
      name, description, status: 'active', visibility: 'private',
      workspaceCount: 0, settings: {}, metadata: {},
      createdAt: now, updatedAt: now,
    };
    this.projects.set(project.id, project);
    return { success: true, data: project };
  }

  async getProjects(orgId: string, pagination: PaginationParams): Promise<PaginatedResponse<Project>> {
    const all = [...this.projects.values()].filter((p) => p.organizationId === orgId);
    const start = (pagination.page - 1) * pagination.limit;
    return createPaginatedResponse(all.slice(start, start + pagination.limit), all.length, pagination);
  }

  private getRolePermissions(role: EnterpriseRole): readonly string[] {
    const perms: Record<EnterpriseRole, readonly string[]> = {
      owner: ['*'],
      administrator: ['org:*', 'team:*', 'project:*', 'workspace:*', 'billing:*', 'security:*', 'audit:*', 'deployment:*', 'agent:*', 'api_key:*'],
      manager: ['org:read', 'team:read', 'team:manage_members', 'project:*', 'workspace:create', 'workspace:update', 'billing:read', 'agent:create', 'agent:manage', 'audit:read'],
      developer: ['org:read', 'team:read', 'project:read', 'workspace:create', 'workspace:update', 'agent:create', 'agent:execute', 'api_key:create'],
      reviewer: ['org:read', 'team:read', 'project:read', 'workspace:read', 'agent:read', 'audit:read'],
      auditor: ['org:read', 'team:read', 'project:read', 'workspace:read', 'billing:read', 'security:read', 'audit:read', 'agent:read'],
      viewer: ['org:read', 'team:read', 'project:read', 'workspace:read'],
    };
    return perms[role] ?? [];
  }
}
