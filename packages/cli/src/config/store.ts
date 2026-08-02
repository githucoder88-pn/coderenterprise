/**
 * Configuration Store
 *
 * Persisted user preferences using Conf.
 */

import Conf from 'conf';
import { ConfigSchema, type CLIConfig } from './schema.js';

let _config: Conf<CLIConfig> | null = null;

export function getConfig(): Conf<CLIConfig> {
  if (!_config) {
    _config = new Conf<CLIConfig>({
      projectName: 'coder-cli',
      schema: {
        apiUrl: { type: 'string', default: 'http://localhost:3000/api/v1' },
        apiKey: { type: 'string' },
        defaultProvider: { type: 'string' },
        defaultModel: { type: 'string' },
        theme: { type: 'string', default: 'dark' },
        editor: { type: 'string' },
        telemetry: { type: 'boolean', default: true },
        outputFormat: { type: 'string', default: 'text' },
        maxHistory: { type: 'number', default: 1000 },
        streamByDefault: { type: 'boolean', default: true },
        autoUpdate: { type: 'boolean', default: true },
      },
    });
  }
  return _config;
}

export function get<K extends keyof CLIConfig>(key: K): CLIConfig[K] {
  return getConfig().get(key);
}

export function set<K extends keyof CLIConfig>(key: K, value: CLIConfig[K]): void {
  getConfig().set(key, value);
}

export function getAll(): CLIConfig {
  return getConfig().store;
}

export function resetConfig(): void {
  getConfig().clear();
}

export function has(key: keyof CLIConfig): boolean {
  return getConfig().has(key);
}
