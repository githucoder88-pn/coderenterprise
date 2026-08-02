/**
 * Conversation Storage Types
 */

import { z } from 'zod';
import type { Timestamps } from '../../types/index.js';

export const CreateConversationSchema = z.object({
  title: z.string().max(200).optional(),
  organizationId: z.string().min(1),
  workspaceId: z.string().min(1),
  model: z.string().min(1),
  provider: z.string().min(1),
  systemPrompt: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const AddMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
  tokenUsage: z.object({
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
    totalTokens: z.number().int(),
  }).optional(),
});

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type AddMessageInput = z.infer<typeof AddMessageSchema>;

export interface Conversation extends Timestamps {
  readonly id: string;
  readonly title: string;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly model: string;
  readonly provider: string;
  readonly messageCount: number;
  readonly totalTokens: number;
  readonly status: 'active' | 'archived' | 'deleted';
  readonly lastMessageAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export interface ConversationMessage extends Timestamps {
  readonly id: string;
  readonly conversationId: string;
  readonly role: 'user' | 'assistant' | 'system' | 'tool';
  readonly content: string;
  readonly tokenUsage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  } | null;
  readonly metadata: Record<string, unknown>;
  readonly sequenceNumber: number;
}
