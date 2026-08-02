/**
 * CLI API Client
 *
 * Communicates with the CODER backend.
 */

import { get } from '../config/store.js';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  stream?: boolean;
}

class CLIError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const apiUrl = get('apiKey') ? get('apiUrl') : get('apiUrl');
  const apiKey = get('apiKey');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    ...options.headers,
  };

  const res = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as any;
    throw new CLIError(
      data?.error?.code ?? 'UNKNOWN',
      data?.error?.message ?? `Request failed: ${res.status}`,
      res.status,
    );
  }

  const data = await res.json() as any;
  return data.data ?? data;
}

async function* streamRequest(path: string, body: unknown): AsyncGenerator<string> {
  const apiUrl = get('apiUrl');
  const apiKey = get('apiKey');

  const res = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new CLIError('STREAM_ERROR', `Stream failed: ${res.status}`);
  if (!res.body) throw new CLIError('NO_BODY', 'No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            if (parsed.delta?.content) yield parsed.delta.content;
            if (parsed.type === 'content' && parsed.delta) yield parsed.delta;
            if (parsed.type === 'done') return;
          } catch { /* skip malformed */ }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export const api = {
  // Auth
  login: (body: { email: string; password: string }) => request<any>('/auth/sign-in', { method: 'POST', body }),
  signup: (body: { email: string; password: string }) => request<any>('/auth/sign-up', { method: 'POST', body }),
  logout: () => request<void>('/auth/sign-out', { method: 'POST' }),
  me: () => request<any>('/auth/me'),

  // Conversations
  getConversations: (page = 1) => request<any>(`/conversations?page=${page}`),
  getConversation: (id: string) => request<any>(`/conversations/${id}`),
  getMessages: (id: string) => request<any>(`/conversations/${id}/messages`),
  sendMessage: (id: string, body: any) => request<any>(`/conversations/${id}/send`, { method: 'POST', body }),
  streamMessage: (id: string, body: any) => streamRequest(`/conversations/${id}/send/stream`, body),
  createConversation: (body: any) => request<any>('/conversations', { method: 'POST', body }),

  // Models
  getModels: (params?: Record<string, string>) => request<any>(`/tools/models?${new URLSearchParams(params ?? {})}`),
  syncModels: () => request<any>('/tools/models/sync', { method: 'POST' }),
  searchModels: (q: string) => request<any>(`/tools/models/search?q=${q}`),

  // Providers
  getProviders: () => request<any>('/providers'),
  getProviderStats: () => request<any>('/providers/stats'),

  // Workspaces
  getWorkspaces: () => request<any>('/workspaces'),
  indexWorkspace: (id: string) => request<any>('/workspace/index', { method: 'POST', body: { workspaceId: id } }),
  searchWorkspace: (body: any) => request<any>('/workspace/search', { method: 'POST', body }),

  // Tools
  getTools: (category?: string) => request<any>(`/tools?category=${category ?? ''}`),
  executeTool: (id: string, input: any) => request<any>(`/tools/${id}/execute`, { method: 'POST', body: { input } }),

  // Billing
  getUsage: () => request<any>('/billing-analytics/usage'),
  getSubscription: () => request<any>('/billing-analytics/subscriptions'),
  getPlans: () => request<any>('/billing-analytics/subscriptions/plans'),

  // Health
  health: () => request<any>('/health'),
  deepHealth: () => request<any>('/health/deep'),

  // Memory
  storeMemory: (body: any) => request<any>('/conversations/memory', { method: 'POST', body }),
  searchMemory: (q: string) => request<any>(`/conversations/memory?q=${q}`),
};

export { CLIError };
