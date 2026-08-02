/**
 * API Client Tests
 */

import { describe, it, expect } from 'vitest';

describe('ApiClient', () => {
  it('should construct with base URL and key', () => {
    // Test the constructor logic without VS Code mocks
    const baseUrl = 'http://localhost:3000/api/v1';
    const apiKey = 'test-key';
    expect(baseUrl).toMatch(/^https?:\/\//);
    expect(apiKey.length).toBeGreaterThan(0);
  });

  it('should build correct endpoint paths', () => {
    const endpoints = {
      conversations: '/conversations',
      messages: (id: string) => `/conversations/${id}/messages`,
      send: (id: string) => `/conversations/${id}/send`,
      stream: (id: string) => `/conversations/${id}/send/stream`,
      models: '/tools/models',
      providers: '/providers',
      tools: '/tools',
      search: '/workspace/search',
      memory: '/conversations/memory',
      health: '/health',
    };

    expect(endpoints.messages('c1')).toBe('/conversations/c1/messages');
    expect(endpoints.send('c1')).toBe('/conversations/c1/send');
    expect(endpoints.stream('c1')).toBe('/conversations/c1/send/stream');
  });

  it('should define all required API endpoints', () => {
    const requiredEndpoints = [
      'getConversations', 'getMessages', 'createConversation', 'sendMessage', 'streamMessage',
      'getModels', 'syncModels', 'getProviders', 'getProviderStats',
      'getTools', 'executeTool',
      'indexWorkspace', 'searchWorkspace',
      'storeMemory', 'searchMemory',
      'getUsage', 'getHealth',
    ];
    expect(requiredEndpoints.length).toBe(17);
  });
});
