/**
 * Firebase Auth Client Adapter
 *
 * Wraps Firebase Admin Auth with type-safe operations.
 */

import * as admin from 'firebase-admin';
import type { ILogger } from '../../telemetry/logger.js';

export interface IUserRecord {
  readonly uid: string;
  readonly email: string;
  readonly displayName?: string;
  readonly photoURL?: string;
  readonly disabled: boolean;
  readonly emailVerified: boolean;
  readonly metadata: {
    readonly creationTime: string;
    readonly lastSignInTime?: string;
  };
  readonly customClaims?: Record<string, unknown>;
}

export interface ICreateUserParams {
  readonly email: string;
  readonly password?: string;
  readonly displayName?: string;
  readonly photoURL?: string;
  readonly disabled?: boolean;
  readonly emailVerified?: boolean;
}

export interface IAuthClient {
  createUser(params: ICreateUserParams): Promise<IUserRecord>;
  getUser(uid: string): Promise<IUserRecord>;
  getUserByEmail(email: string): Promise<IUserRecord>;
  updateUser(uid: string, params: Partial<ICreateUserParams>): Promise<IUserRecord>;
  deleteUser(uid: string): Promise<void>;
  setCustomClaims(uid: string, claims: Record<string, unknown>): Promise<void>;
  verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken>;
  createCustomToken(uid: string, claims?: Record<string, unknown>): Promise<string>;
  revokeRefreshTokens(uid: string): Promise<void>;
  listUsers(maxResults?: number, pageToken?: string): Promise<{
    readonly users: readonly IUserRecord[];
    readonly pageToken?: string;
  }>;
  healthCheck(): Promise<boolean>;
}

export class AuthClientAdapter implements IAuthClient {
  private readonly auth: admin.auth.Auth;

  constructor(private readonly logger: ILogger) {
    this.auth = admin.auth();
    this.logger.info('Firebase Auth initialized');
  }

  async createUser(params: ICreateUserParams): Promise<IUserRecord> {
    const record = await this.auth.createUser({
      email: params.email,
      password: params.password,
      displayName: params.displayName,
      photoURL: params.photoURL,
      disabled: params.disabled ?? false,
      emailVerified: params.emailVerified ?? false,
    });
    return this.mapUserRecord(record);
  }

  async getUser(uid: string): Promise<IUserRecord> {
    const record = await this.auth.getUser(uid);
    return this.mapUserRecord(record);
  }

  async getUserByEmail(email: string): Promise<IUserRecord> {
    const record = await this.auth.getUserByEmail(email);
    return this.mapUserRecord(record);
  }

  async updateUser(
    uid: string,
    params: Partial<ICreateUserParams>,
  ): Promise<IUserRecord> {
    const record = await this.auth.updateUser(uid, params);
    return this.mapUserRecord(record);
  }

  async deleteUser(uid: string): Promise<void> {
    await this.auth.deleteUser(uid);
  }

  async setCustomClaims(
    uid: string,
    claims: Record<string, unknown>,
  ): Promise<void> {
    await this.auth.setCustomUserClaims(uid, claims);
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    return this.auth.verifyIdToken(idToken);
  }

  async createCustomToken(
    uid: string,
    claims?: Record<string, unknown>,
  ): Promise<string> {
    return this.auth.createCustomToken(uid, claims);
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    await this.auth.revokeRefreshTokens(uid);
  }

  async listUsers(maxResults?: number, pageToken?: string) {
    const result = await this.auth.listUsers(maxResults ?? 1000, pageToken);
    return {
      users: result.users.map((u) => this.mapUserRecord(u)),
      pageToken: result.pageToken,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.auth.listUsers(1);
      return true;
    } catch {
      return false;
    }
  }

  private mapUserRecord(record: admin.auth.UserRecord): IUserRecord {
    return {
      uid: record.uid,
      email: record.email ?? '',
      displayName: record.displayName ?? undefined,
      photoURL: record.photoURL ?? undefined,
      disabled: record.disabled,
      emailVerified: record.emailVerified,
      metadata: {
        creationTime: record.metadata.creationTime,
        lastSignInTime: record.metadata.lastSignInTime,
      },
      customClaims: (record.customClaims as Record<string, unknown>) ?? undefined,
    };
  }
}
