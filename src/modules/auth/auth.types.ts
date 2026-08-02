/**
 * Auth Module Types
 */

import { z } from 'zod';

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(100).optional(),
  organizationName: z.string().min(1).max(100).optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type SignInInput = z.infer<typeof SignInSchema>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
  readonly tokenType: 'Bearer';
}

export interface AuthSession {
  readonly user: {
    readonly uid: string;
    readonly email: string;
    readonly displayName: string;
    readonly role: string;
    readonly organizationId: string;
  };
  readonly tokens: AuthTokens;
}
