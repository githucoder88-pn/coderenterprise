/**
 * Mobile API Client — communicates with CODER backend
 */

import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('coder_token');
}

async function request<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as any;
    throw new ApiError(res.status, data?.error?.code ?? 'UNKNOWN', data?.error?.message ?? 'Request failed');
  }

  const data = await res.json() as any;
  return (data.data ?? data) as T;
}

async function* stream(path: string, body: unknown): AsyncGenerator<string> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) throw new Error(`Stream failed: ${res.status}`);
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
          const d = line.slice(6).trim();
          if (d === '[DONE]') return;
          try { const p = JSON.parse(d); if (p.delta?.content) yield p.delta.content; } catch {}
        }
      }
    }
  } finally { reader.releaseLock(); }
}

export const api = {
  // Auth
  signIn: (body: { email: string; password: string }) => request<any>('/auth/sign-in', { method: 'POST', body }),
  signUp: (body: { email: string; password: string; displayName?: string }) => request<any>('/auth/sign-up', { method: 'POST', body }),
  signOut: () => request<void>('/auth/sign-out', { method: 'POST' }),
  me: () => request<any>('/auth/me'),

  // Conversations
  getConversations: (page = 1) => request<any>(`/conversations?page=${page}`),
  getMessages: (id: string) => request<any>(`/conversations/${id}/messages`),
  createConversation: (body: any) => request<any>('/conversations', { method: 'POST', body }),
  sendMessage: (id: string, body: any) => request<any>(`/conversations/${id}/send`, { method: 'POST', body }),
  streamMessage: (id: string, body: any) => stream(`/conversations/${id}/send/stream`, body),

  // Providers
  getProviders: () => request<any>('/providers'),
  getProviderStats: () => request<any>('/providers/stats'),

  // Models
  getModels: (params?: Record<string, string>) => request<any>(`/tools/models?${new URLSearchParams(params ?? {})}`),
  syncModels: () => request<any>('/tools/models/sync', { method: 'POST' }),

  // Workspaces
  getWorkspaces: () => request<any>('/workspaces'),
  indexWorkspace: (id: string) => request<any>('/workspace/index', { method: 'POST', body: { workspaceId: id } }),
  searchWorkspace: (body: any) => request<any>('/workspace/search', { method: 'POST', body }),

  // Agents
  getAgents: () => request<any>('/orchestrator/agents'),
  scheduleAgent: (body: any) => request<any>('/orchestrator/goals', { method: 'POST', body }),

  // Notifications
  getNotifications: (page = 1) => request<any>(`/dashboard/notifications?page=${page}`),
  getUnreadCount: () => request<any>('/dashboard/notifications/unread-count'),
  markRead: (id: string) => request<any>(`/dashboard/notifications/${id}/read`, { method: 'POST' }),

  // Billing
  getUsage: () => request<any>('/billing-analytics/usage'),
  getSubscription: () => request<any>('/billing-analytics/subscriptions'),
  getPlans: () => request<any>('/billing-analytics/subscriptions/plans'),
  getInvoices: () => request<any>('/billing-analytics/invoices'),

  // Account
  getProfile: () => request<any>('/dashboard/profile'),
  updateProfile: (body: any) => request<any>('/dashboard/profile', { method: 'PATCH', body }),
  getApiKeys: () => request<any>('/api-keys'),

  // Extensions
  getExtensions: () => request<any>('/extensions'),

  // Health
  health: () => request<any>('/health'),

  // Tools
  getTools: (category?: string) => request<any>(`/tools?category=${category ?? ''}`),
};

export { ApiError };
