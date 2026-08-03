/**
 * User Service
 *
 * Business logic for user management.
 */

import { BaseService } from '../../core/base-service.js';
import type { UserRepository } from './user.repository.js';
import type { IAuthClient } from '../../infrastructure/firebase/auth-client.js';
import type { IAuditService } from '../audit/audit.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type { User, CreateUserInput, UpdateUserInput } from './user.types.js';
import {
  CreateUserSchema,
  UpdateUserSchema,
} from './user.types.js';
import {
  DomainEvent,
  ErrorCode,
  type Result,
  type PaginationParams,
  type PaginatedResponse,
  type AuthenticatedUser,
} from '../../types/index.js';

export interface IUserService {
  getById(id: string): Promise<Result<User>>;
  getByEmail(email: string): Promise<Result<User>>;
  create(input: CreateUserInput): Promise<Result<User>>;
  update(id: string, input: UpdateUserInput, actor: AuthenticatedUser): Promise<Result<User>>;
  delete(id: string, actor: AuthenticatedUser): Promise<Result<void>>;
  listByOrganization(
    organizationId: string,
    pagination: PaginationParams,
  ): Promise<Result<PaginatedResponse<User>>>;
  suspend(id: string, actor: AuthenticatedUser): Promise<Result<User>>;
  reactivate(id: string, actor: AuthenticatedUser): Promise<Result<User>>;
}

export class UserService extends BaseService implements IUserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authClient: IAuthClient,
    private readonly audit: IAuditService,
    logger: ILogger,
    eventBus: IEventBus,
  ) {
    super(logger, eventBus);
  }

  async getById(id: string): Promise<Result<User>> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      return this.failure(ErrorCode.NOT_FOUND, `User ${id} not found`);
    }
    return this.success(user);
  }

  async getByEmail(email: string): Promise<Result<User>> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      return this.failure(ErrorCode.NOT_FOUND, `User with email ${email} not found`);
    }
    return this.success(user);
  }

  async create(input: CreateUserInput): Promise<Result<User>> {
    const parsed = CreateUserSchema.safeParse(input);
    if (!parsed.success) {
      return this.failure(
        ErrorCode.VALIDATION,
        'Invalid user input',
        { errors: parsed.error.flatten() },
      );
    }

    const existing = await this.userRepo.findByEmail(parsed.data.email);
    if (existing) {
      return this.failure(ErrorCode.CONFLICT, 'User with this email already exists');
    }

    try {
      // Create Firebase Auth user
      const authUser = await this.authClient.createUser({
        email: parsed.data.email,
        password: parsed.data.password,
        displayName: parsed.data.displayName,
        emailVerified: false,
      });

      // Set custom claims
      await this.authClient.setCustomClaims(authUser.uid, {
        role: parsed.data.role,
        organizationId: parsed.data.organizationId ?? '',
      });

      // Create Firestore user record
      const user = await this.userRepo.create({
        id: authUser.uid,
        email: parsed.data.email,
        displayName: parsed.data.displayName ?? '',
        photoURL: null,
        organizationId: parsed.data.organizationId ?? '',
        role: parsed.data.role,
        status: 'active',
        metadata: {},
        lastLoginAt: null,
        emailVerified: false,
      });

      await this.emitEvent(
        DomainEvent.USER_CREATED,
        user.id,
        'User',
        { email: user.email, role: user.role, organizationId: user.organizationId },
      );

      await this.audit.log({
        action: 'user.created',
        actorId: user.id,
        targetId: user.id,
        targetType: 'User',
        data: { email: user.email },
      });

      return this.success(user);
    } catch (error) {
      return this.failure(ErrorCode.INTERNAL, 'Failed to create user');
    }
  }

  async update(
    id: string,
    input: UpdateUserInput,
    actor: AuthenticatedUser,
  ): Promise<Result<User>> {
    const parsed = UpdateUserSchema.safeParse(input);
    if (!parsed.success) {
      return this.failure(
        ErrorCode.VALIDATION,
        'Invalid update input',
        { errors: parsed.error.flatten() },
      );
    }

    const user = await this.userRepo.findById(id);
    if (!user) {
      return this.failure(ErrorCode.NOT_FOUND, `User ${id} not found`);
    }

    const updated = await this.userRepo.update(id, parsed.data);

    await this.emitEvent(
      DomainEvent.USER_UPDATED,
      id,
      'User',
      { changes: parsed.data },
      { userId: actor.uid, organizationId: actor.organizationId },
    );

    await this.audit.log({
      action: 'user.updated',
      actorId: actor.uid,
      targetId: id,
      targetType: 'User',
      data: { changes: parsed.data },
    });

    return this.success(updated);
  }

  async delete(id: string, actor: AuthenticatedUser): Promise<Result<void>> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      return this.failure(ErrorCode.NOT_FOUND, `User ${id} not found`);
    }

    await this.userRepo.delete(id);
    await this.authClient.deleteUser(id);

    await this.emitEvent(
      DomainEvent.USER_DELETED,
      id,
      'User',
      {},
      { userId: actor.uid, organizationId: actor.organizationId },
    );

    await this.audit.log({
      action: 'user.deleted',
      actorId: actor.uid,
      targetId: id,
      targetType: 'User',
      data: {},
    });

    return this.success(undefined);
  }

  async listByOrganization(
    organizationId: string,
    pagination: PaginationParams,
  ): Promise<Result<PaginatedResponse<User>>> {
    const result = await this.userRepo.findPaginated(
      [{ field: 'organizationId', operator: '==', value: organizationId }],
      pagination,
    );
    return this.success(result);
  }

  async suspend(id: string, actor: AuthenticatedUser): Promise<Result<User>> {
    const user = await this.userRepo.findById(id);
    if (!user) return this.failure(ErrorCode.NOT_FOUND, `User ${id} not found`);

    const updated = await this.userRepo.update(id, { status: 'suspended' });

    await this.emitEvent(
      DomainEvent.USER_SUSPENDED,
      id,
      'User',
      {},
      { userId: actor.uid, organizationId: actor.organizationId },
    );

    await this.audit.log({
      action: 'user.suspended',
      actorId: actor.uid,
      targetId: id,
      targetType: 'User',
      data: {},
    });

    return this.success(updated);
  }

  async reactivate(id: string, actor: AuthenticatedUser): Promise<Result<User>> {
    const user = await this.userRepo.findById(id);
    if (!user) return this.failure(ErrorCode.NOT_FOUND, `User ${id} not found`);

    const updated = await this.userRepo.update(id, { status: 'active' });

    await this.audit.log({
      action: 'user.reactivated',
      actorId: actor.uid,
      targetId: id,
      targetType: 'User',
      data: {},
    });

    return this.success(updated);
  }
}
