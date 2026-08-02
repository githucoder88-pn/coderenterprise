/**
 * Model Registry Types
 */

import { z } from 'zod';
import type { Timestamps } from '../../types/index.js';

export const RegisterModelSchema = z.object({
  modelId: z.string().min(1),
  provider: z.string().min(1),
  displayName: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  capabilities: z.object({
    streaming: z.boolean().default(true),
    toolCalling: z.boolean().default(false),
    vision: z.boolean().default(false),
    embeddings: z.boolean().default(false),
    imageGeneration: z.boolean().default(false),
    reasoning: z.boolean().default(false),
    structuredOutput: z.boolean().default(false),
  }),
  contextWindow: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  pricing: z.object({
    inputPerMillion: z.number().min(0),
    outputPerMillion: z.number().min(0),
    currency: z.string().default('USD'),
  }).optional(),
  tags: z.array(z.string()).default([]),
  deprecated: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateModelSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  capabilities: z.record(z.boolean()).optional(),
  contextWindow: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  pricing: z.object({
    inputPerMillion: z.number().min(0),
    outputPerMillion: z.number().min(0),
  }).optional(),
  tags: z.array(z.string()).optional(),
  deprecated: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type RegisterModelInput = z.infer<typeof RegisterModelSchema>;
export type UpdateModelInput = z.infer<typeof UpdateModelSchema>;

export interface Model extends Timestamps {
  readonly id: string;
  readonly modelId: string;
  readonly provider: string;
  readonly displayName: string;
  readonly description: string;
  readonly capabilities: {
    readonly streaming: boolean;
    readonly toolCalling: boolean;
    readonly vision: boolean;
    readonly embeddings: boolean;
    readonly imageGeneration: boolean;
    readonly reasoning: boolean;
    readonly structuredOutput: boolean;
  };
  readonly contextWindow: number;
  readonly maxOutputTokens: number;
  readonly pricing: {
    readonly inputPerMillion: number;
    readonly outputPerMillion: number;
    readonly currency: string;
  } | null;
  readonly tags: readonly string[];
  readonly deprecated: boolean;
  readonly status: 'active' | 'deprecated' | 'removed';
  readonly metadata: Record<string, unknown>;
}
