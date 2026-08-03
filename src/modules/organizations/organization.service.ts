/**
 * Organization Service
 */

import { BaseService } from '../../core/base-service.js';
import type { OrganizationRepository } from './organization.repository.js';
import type { IAuditService } from '../audit/audit.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  AddMemberInput,
  OrganizationMember,
} from './organization.types.js';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  AddMemberSchema,
} from './organization.types.js';
import {
  DomainEvent,
  ErrorCode,
  type Result,
  type PaginationParams,
  type PaginatedResponse,
  type AuthenticatedUser,
} from '../../types/index.js';

export interface IOrganizationService {
  getById(id: string): Promise<Result<Organization>>;
  getBySlug(slug: string): Promise<Result<Organization>>;
  create(input: CreateOrganizationInput, owner: AuthenticatedUser): Promise<Result<Organization>>;
  update(id: string, input: UpdateOrganizationInput, actor: AuthenticatedUser): Promise<Result<Organization>>;
  delete(id: string, actor: AuthenticatedUser): Promise<Result<void>>;
  addMember(orgId: string, input: AddMemberInput, actor: AuthenticatedUser): Promise<Result<OrganizationMember>>;
  removeMember(orgId: string, userId: string, actor: AuthenticatedUser): Promise<Result<void>>;
  listMembers(orgId: string): Promise<Result<readonly OrganizationMember[]>>;
  listByOwner(ownerId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Organization>>>;
}

export class OrganizationService extends BaseService implements IOrganizationService {
  constructor(
    private readonly orgRepo: OrganizationRepository,
    private readonly audit: IAuditService,
    logger: ILogger,
    eventBus: IEventBus,
  ) {
    super(logger, eventBus);
  }

  async getById(id: string): Promise<Result<Organization>> {
    const org = await this.orgRepo.findById(id);
    if (!org) return this.failure(ErrorCode.ORG_NOT_FOUND, `Organization ${id} not found`);
    return this.success(org);
  }

  async getBySlug(slug: string): Promise<Result<Organization>> {
    const org = await this.orgRepo.findBySlug(slug);
    if (!org) return this.failure(ErrorCode.ORG_NOT_FOUND, `Organization with slug ${slug} not found`);
    return this.success(org);
  }

  async create(
    input: CreateOrganizationInput,
    owner: AuthenticatedUser,
  ): Promise<Result<Organization>> {
    const parsed = CreateOrganizationSchema.safeParse(input);
    if (!parsed.success) {
      return this.failure(ErrorCode.VALIDATION, 'Invalid organization input', { errors: parsed.error.flatten() });
    }

    const existing = await this.orgRepo.findBySlug(parsed.data.slug);
    if (existing) {
      return this.failure(ErrorCode.CONFLICT, `Organization with slug ${parsed.data.slug} already exists`);
    }

    const org = await this.orgRepo.create({
      name: parsed.data.name,
      slug: parsed.data.slug,
      plan: parsed.data.plan,
      ownerId: owner.uid,
      memberCount: 1,
      status: 'active',
      metadata: parsed.data.metadata ?? {},
      settings: {},
    });

    await this.orgRepo.addMember(org.id, owner.uid, 'owner');

    await this.emitEvent(DomainEvent.ORG_CREATED, org.id, 'Organization', { name: org.name, slug: org.slug });
    await this.audit.log({
      action: 'organization.created',
      actorId: owner.uid,
      targetId: org.id,
      targetType: 'Organization',
      data: { name: org.name, slug: org.slug },
    });

    return this.success(org);
  }

  async update(
    id: string,
    input: UpdateOrganizationInput,
    actor: AuthenticatedUser,
  ): Promise<Result<Organization>> {
    const parsed = UpdateOrganizationSchema.safeParse(input);
    if (!parsed.success) {
      return this.failure(ErrorCode.VALIDATION, 'Invalid update input', { errors: parsed.error.flatten() });
    }

    const org = await this.orgRepo.findById(id);
    if (!org) return this.failure(ErrorCode.ORG_NOT_FOUND, `Organization ${id} not found`);

    const updated = await this.orgRepo.update(id, parsed.data);

    await this.emitEvent(DomainEvent.ORG_UPDATED, id, 'Organization', { changes: parsed.data });
    await this.audit.log({
      action: 'organization.updated',
      actorId: actor.uid,
      targetId: id,
      targetType: 'Organization',
      data: { changes: parsed.data },
    });

    return this.success(updated);
  }

  async delete(id: string, actor: AuthenticatedUser): Promise<Result<void>> {
    const org = await this.orgRepo.findById(id);
    if (!org) return this.failure(ErrorCode.ORG_NOT_FOUND, `Organization ${id} not found`);

    if (org.ownerId !== actor.uid && !actor.permissions.includes('admin:all')) {
      return this.failure(ErrorCode.FORBIDDEN, 'Only the owner can delete an organization');
    }

    await this.orgRepo.delete(id);

    await this.emitEvent(DomainEvent.ORG_DELETED, id, 'Organization', {});
    await this.audit.log({
      action: 'organization.deleted',
      actorId: actor.uid,
      targetId: id,
      targetType: 'Organization',
      data: {},
    });

    return this.success(undefined);
  }

  async addMember(
    orgId: string,
    input: AddMemberInput,
    actor: AuthenticatedUser,
  ): Promise<Result<OrganizationMember>> {
    const parsed = AddMemberSchema.safeParse(input);
    if (!parsed.success) {
      return this.failure(ErrorCode.VALIDATION, 'Invalid member input', { errors: parsed.error.flatten() });
    }

    const org = await this.orgRepo.findById(orgId);
    if (!org) return this.failure(ErrorCode.ORG_NOT_FOUND, `Organization ${orgId} not found`);

    const existing = await this.orgRepo.getMember(orgId, parsed.data.userId);
    if (existing) {
      return this.failure(ErrorCode.ORG_MEMBER_EXISTS, 'User is already a member of this organization');
    }

    const member = await this.orgRepo.addMember(orgId, parsed.data.userId, parsed.data.role);
    await this.orgRepo.update(orgId, { memberCount: org.memberCount + 1 });

    await this.emitEvent(DomainEvent.ORG_MEMBER_ADDED, orgId, 'Organization', {
      userId: parsed.data.userId,
      role: parsed.data.role,
    });
    await this.audit.log({
      action: 'organization.member.added',
      actorId: actor.uid,
      targetId: orgId,
      targetType: 'Organization',
      data: { userId: parsed.data.userId, role: parsed.data.role },
    });

    return this.success(member);
  }

  async removeMember(orgId: string, userId: string, actor: AuthenticatedUser): Promise<Result<void>> {
    const org = await this.orgRepo.findById(orgId);
    if (!org) return this.failure(ErrorCode.ORG_NOT_FOUND, `Organization ${orgId} not found`);

    const member = await this.orgRepo.getMember(orgId, userId);
    if (!member) return this.failure(ErrorCode.NOT_FOUND, 'Member not found');

    if (member.role === 'owner') {
      return this.failure(ErrorCode.FORBIDDEN, 'Cannot remove the organization owner');
    }

    await this.orgRepo.removeMember(orgId, userId);
    await this.orgRepo.update(orgId, { memberCount: Math.max(0, org.memberCount - 1) });

    await this.emitEvent(DomainEvent.ORG_MEMBER_REMOVED, orgId, 'Organization', { userId });
    await this.audit.log({
      action: 'organization.member.removed',
      actorId: actor.uid,
      targetId: orgId,
      targetType: 'Organization',
      data: { userId },
    });

    return this.success(undefined);
  }

  async listMembers(orgId: string): Promise<Result<readonly OrganizationMember[]>> {
    const org = await this.orgRepo.findById(orgId);
    if (!org) return this.failure(ErrorCode.ORG_NOT_FOUND, `Organization ${orgId} not found`);
    const members = await this.orgRepo.listMembers(orgId);
    return this.success(members);
  }

  async listByOwner(
    ownerId: string,
    pagination: PaginationParams,
  ): Promise<Result<PaginatedResponse<Organization>>> {
    const result = await this.orgRepo.findPaginated(
      [{ field: 'ownerId', operator: '==', value: ownerId }],
      pagination,
    );
    return this.success(result);
  }
}
