/**
 * Auth Service
 *
 * Handles sign-in, sign-up, token refresh, and session management.
 */

import { BaseService } from '../../core/base-service.js';
import type { IAuthClient } from '../../infrastructure/firebase/auth-client.js';
import type { IAuditService } from '../audit/audit.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type { AuthSession, AuthTokens } from './auth.types.js';
import type { SignInInput, SignUpInput } from './auth.types.js';
import {
  DomainEvent,
  ErrorCode,
  type Result,
} from '../../types/index.js';

export interface IAuthService {
  signIn(input: SignInInput): Promise<Result<AuthSession>>;
  signUp(input: SignUpInput): Promise<Result<AuthSession>>;
  signOut(uid: string): Promise<Result<void>>;
  refreshToken(uid: string): Promise<Result<AuthTokens>>;
  verifyToken(token: string): Promise<Result<{ uid: string; email: string }>>;
  getCurrentSession(uid: string): Promise<Result<AuthSession>>;
}

export class AuthService extends BaseService implements IAuthService {
  constructor(
    private readonly authClient: IAuthClient,
    private readonly audit: IAuditService,
    logger: ILogger,
    eventBus: IEventBus,
  ) {
    super(logger, eventBus);
  }

  async signIn(input: SignInInput): Promise<Result<AuthSession>> {
    try {
      let user;
      try {
        user = await this.authClient.getUserByEmail(input.email);
      } catch {
        return this.failure(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid email or password');
      }

      if (user.disabled) {
        return this.failure(ErrorCode.AUTH_USER_DISABLED, 'User account is disabled');
      }

      const token = await this.authClient.createCustomToken(user.uid, {
        role: (user.customClaims?.['role'] as string) ?? 'member',
        organizationId: (user.customClaims?.['organizationId'] as string) ?? '',
      });

      const session: AuthSession = {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName ?? '',
          role: (user.customClaims?.['role'] as string) ?? 'member',
          organizationId: (user.customClaims?.['organizationId'] as string) ?? '',
        },
        tokens: {
          accessToken: token,
          refreshToken: token, // In production, generate a separate refresh token
          expiresIn: 3600,
          tokenType: 'Bearer',
        },
      };

      await this.emitEvent(DomainEvent.AUTH_SIGN_IN, user.uid, 'User', { email: user.email });
      await this.audit.log({
        action: 'auth.sign_in',
        actorId: user.uid,
        targetId: user.uid,
        targetType: 'User',
        data: { email: user.email },
      });

      return this.success(session);
    } catch (error) {
      return this.wrapError(error, ErrorCode.AUTH_INVALID_CREDENTIALS, 'Sign in failed') as unknown as Result<AuthSession>;
    }
  }

  async signUp(input: SignUpInput): Promise<Result<AuthSession>> {
    try {
      // Check if user already exists
      try {
        await this.authClient.getUserByEmail(input.email);
        return this.failure(ErrorCode.CONFLICT, 'User with this email already exists');
      } catch {
        // User doesn't exist, proceed
      }

      const user = await this.authClient.createUser({
        email: input.email,
        password: input.password,
        displayName: input.displayName,
        emailVerified: false,
      });

      await this.authClient.setCustomClaims(user.uid, {
        role: 'member',
        organizationId: '',
      });

      const token = await this.authClient.createCustomToken(user.uid, {
        role: 'member',
        organizationId: '',
      });

      const session: AuthSession = {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: input.displayName ?? '',
          role: 'member',
          organizationId: '',
        },
        tokens: {
          accessToken: token,
          refreshToken: token,
          expiresIn: 3600,
          tokenType: 'Bearer',
        },
      };

      await this.emitEvent(DomainEvent.AUTH_SIGN_UP, user.uid, 'User', { email: user.email });
      await this.emitEvent(DomainEvent.USER_CREATED, user.uid, 'User', { email: user.email });
      await this.audit.log({
        action: 'auth.sign_up',
        actorId: user.uid,
        targetId: user.uid,
        targetType: 'User',
        data: { email: user.email },
      });

      return this.success(session);
    } catch (error) {
      return this.wrapError(error, ErrorCode.INTERNAL, 'Sign up failed') as unknown as Result<AuthSession>;
    }
  }

  async signOut(uid: string): Promise<Result<void>> {
    try {
      await this.authClient.revokeRefreshTokens(uid);
      await this.emitEvent(DomainEvent.AUTH_SIGN_OUT, uid, 'User', {});
      await this.audit.log({
        action: 'auth.sign_out',
        actorId: uid,
        targetId: uid,
        targetType: 'User',
        data: {},
      });
      return this.success(undefined);
    } catch (error) {
      return this.wrapError(error, ErrorCode.INTERNAL, 'Sign out failed') as unknown as Result<void>;
    }
  }

  async refreshToken(uid: string): Promise<Result<AuthTokens>> {
    try {
      const user = await this.authClient.getUser(uid);
      const token = await this.authClient.createCustomToken(uid, {
        role: (user.customClaims?.['role'] as string) ?? 'member',
        organizationId: (user.customClaims?.['organizationId'] as string) ?? '',
      });

      return this.success({
        accessToken: token,
        refreshToken: token,
        expiresIn: 3600,
        tokenType: 'Bearer',
      });
    } catch (error) {
      return this.wrapError(error, ErrorCode.AUTH_TOKEN_INVALID, 'Failed to refresh token') as unknown as Result<AuthTokens>;
    }
  }

  async verifyToken(token: string): Promise<Result<{ uid: string; email: string }>> {
    try {
      const decoded = await this.authClient.verifyIdToken(token);
      return this.success({ uid: decoded.uid, email: decoded.email ?? '' });
    } catch (error) {
      return this.wrapError(error, ErrorCode.AUTH_TOKEN_INVALID, 'Invalid token') as unknown as Result<{ uid: string; email: string }>;
    }
  }

  async getCurrentSession(uid: string): Promise<Result<AuthSession>> {
    try {
      const user = await this.authClient.getUser(uid);
      return this.success({
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName ?? '',
          role: (user.customClaims?.['role'] as string) ?? 'member',
          organizationId: (user.customClaims?.['organizationId'] as string) ?? '',
        },
        tokens: {
          accessToken: '',
          refreshToken: '',
          expiresIn: 0,
          tokenType: 'Bearer',
        },
      });
    } catch (error) {
      return this.wrapError(error, ErrorCode.NOT_FOUND, 'User not found') as unknown as Result<AuthSession>;
    }
  }
}
