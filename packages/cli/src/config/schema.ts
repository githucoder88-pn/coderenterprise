/**
 * CLI Configuration Schema
 */

import { z } from 'zod';

export const ConfigSchema = z.object({
  apiUrl: z.string().url().default('http://localhost:3000/api/v1'),
  apiKey: z.string().optional(),
  defaultProvider: z.string().optional(),
  defaultModel: z.string().optional(),
  theme: z.enum(['dark', 'light']).default('dark'),
  editor: z.string().optional(),
  telemetry: z.boolean().default(true),
  outputFormat: z.enum(['text', 'json', 'markdown']).default('text'),
  maxHistory: z.number().int().positive().default(1000),
  streamByDefault: z.boolean().default(true),
  autoUpdate: z.boolean().default(true),
});

export type CLIConfig = z.infer<typeof ConfigSchema>;
