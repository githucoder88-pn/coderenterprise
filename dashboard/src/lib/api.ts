/**
 * API Client
 *
 * Type-safe HTTP client that connects to the CODER backend.
 */

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';

interface ApiOptions {
  readonly method?: string;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
  readonly signal?: AbortSignal;
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const data = await res.json() as any;

  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.code ?? 'UNKNOWN', data?.error?.message ?? 'Request failed', data?.error?.details);
  }

  return data.data ?? data;
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const { getAuth } = await import('firebase/auth');
    const user = getAuth().currentUser;
    return user ? await user.getIdToken() : null;
  } catch {
    return null;
  }
}

// ─── Typed API Methods ─────────────────────────────────────────────────────

export const api = {
  // Auth
  signIn: (body: { email: string; password: string }) => request<any>('/auth/sign-in', { method: 'POST', body }),
  signUp: (body: { email: string; password: string; displayName?: string }) => request<any>('/auth/sign-up', { method: 'POST', body }),
  signOut: () => request<void>('/auth/sign-out', { method: 'POST' }),
  getMe: () => request<any>('/auth/me'),

  // Users
  getUsers: (params?: Record<string, string>) => request<any>(`/users?${new URLSearchParams(params ?? {})}`),
  getUser: (id: string) => request<any>(`/users/${id}`),

  // Organizations
  getOrganization: (id: string) => request<any>(`/organizations/${id}`),
  updateOrganization: (id: string, body: any) => request<any>(`/organizations/${id}`, { method: 'PATCH', body }),

  // Dashboard
  getProfile: () => request<any>('/dashboard/profile'),
  updateProfile: (body: any) => request<any>('/dashboard/profile', { method: 'PATCH', body }),
  getUsageSummary: (period?: string) => request<any>(`/dashboard/usage/summary?period=${period ?? ''}`),
  getSpending: () => request<any>('/dashboard/spending'),
  getActivity: (params?: Record<string, string>) => request<any>(`/dashboard/activity?${new URLSearchParams(params ?? {})}`),
  getModels: (params?: Record<string, string>) => request<any>(`/dashboard/models?${new URLSearchParams(params ?? {})}`),
  searchModels: (q: string) => request<any>(`/dashboard/models/search?q=${q}`),
  getNotifications: (params?: Record<string, string>) => request<any>(`/dashboard/notifications?${new URLSearchParams(params ?? {})}`),
  getUnreadCount: () => request<any>('/dashboard/notifications/unread-count'),
  markNotificationRead: (id: string) => request<any>(`/dashboard/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request<any>('/dashboard/notifications/mark-all-read', { method: 'POST' }),

  // Conversations
  getConversations: (params?: Record<string, string>) => request<any>(`/conversations?${new URLSearchParams(params ?? {})}`),
  getConversation: (id: string) => request<any>(`/conversations/${id}`),
  getMessages: (id: string, params?: Record<string, string>) => request<any>(`/conversations/${id}/messages?${new URLSearchParams(params ?? {})}`),
  sendMessage: (id: string, body: any) => request<any>(`/conversations/${id}/send`, { method: 'POST', body }),

  // Workspaces
  getWorkspaces: (params?: Record<string, string>) => request<any>(`/workspaces?${new URLSearchParams(params ?? {})}`),
  createWorkspace: (body: any) => request<any>('/workspaces', { method: 'POST', body }),

  // Providers
  getProviders: () => request<any>('/providers'),
  getProviderStats: () => request<any>('/providers/stats'),
  getProviderHealth: () => request<any>('/providers/healthy'),

  // API Keys
  getApiKeys: (params?: Record<string, string>) => request<any>(`/api-keys?${new URLSearchParams(params ?? {})}`),
  createApiKey: (body: any) => request<any>('/api-keys', { method: 'POST', body }),
  deleteApiKey: (id: string) => request<any>(`/api-keys/${id}`, { method: 'DELETE' }),

  // Billing
  getPlans: () => request<any>('/billing/plans'),
  getSubscription: () => request<any>('/billing-analytics/subscriptions'),
  getInvoices: (params?: Record<string, string>) => request<any>(`/billing-analytics/invoices?${new URLSearchParams(params ?? {})}`),
  getQuotas: () => request<any>('/billing-analytics/quotas'),

  // Prompts
  getPrompts: (params?: Record<string, string>) => request<any>(`/prompts?${new URLSearchParams(params ?? {})}`),
  createPrompt: (body: any) => request<any>('/prompts', { method: 'POST', body }),

  // Audit
  getAuditLogs: (params?: Record<string, string>) => request<any>(`/audit?${new URLSearchParams(params ?? {})}`),

  // Tools
  getTools: (category?: string) => request<any>(`/tools?category=${category ?? ''}`),
  getToolStats: () => request<any>('/tools/stats'),

  // Models (dynamic registry)
  getAllModels: (params?: Record<string, string>) => request<any>(`/tools/models?${new URLSearchParams(params ?? {})}`),
  syncModels: () => request<any>('/tools/models/sync', { method: 'POST' }),

  // Search
  search: (body: any) => request<any>('/workspace/search', { method: 'POST', body }),

  // Health
  getHealth: () => request<any>('/health'),
  getDeepHealth: () => request<any>('/health/deep'),
};

export { ApiError };
