/**
 * CLI Config Tests
 */

import { describe, it, expect } from 'vitest';
import { ConfigSchema } from '../../config/schema.js';

describe('ConfigSchema', () => {
  it('should parse with defaults', () => {
    const result = ConfigSchema.parse({});
    expect(result.apiUrl).toBe('http://localhost:3000/api/v1');
    expect(result.theme).toBe('dark');
    expect(result.telemetry).toBe(true);
    expect(result.streamByDefault).toBe(true);
  });

  it('should validate URL', () => {
    expect(() => ConfigSchema.parse({ apiUrl: 'not-a-url' })).toThrow();
  });

  it('should accept custom values', () => {
    const result = ConfigSchema.parse({ apiUrl: 'https://api.example.com/v1', theme: 'light', defaultModel: 'gpt-4o' });
    expect(result.apiUrl).toBe('https://api.example.com/v1');
    expect(result.theme).toBe('light');
    expect(result.defaultModel).toBe('gpt-4o');
  });

  it('should validate theme enum', () => {
    expect(() => ConfigSchema.parse({ theme: 'invalid' })).toThrow();
  });

  it('should validate output format', () => {
    const result = ConfigSchema.parse({ outputFormat: 'json' });
    expect(result.outputFormat).toBe('json');
  });
});
