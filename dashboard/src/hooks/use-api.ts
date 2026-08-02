'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ─── Generic hook factory ───────────────────────────────────────────────────

function useApiQuery<T>(key: string[], fetcher: () => Promise<T>, opts?: Partial<UseQueryOptions<T>>) {
  return useQuery({ queryKey: key, queryFn: fetcher, ...opts });
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export function useProfile() {
  return useApiQuery(['profile'], () => api.getProfile(), { retry: false });
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export function useUsageSummary(period?: string) {
  return useApiQuery(['usage', period], () => api.getUsageSummary(period));
}

export function useSpending() {
  return useApiQuery(['spending'], () => api.getSpending());
}

export function useActivity(page = 1, limit = 20) {
  return useApiQuery(['activity', page, limit], () => api.getActivity({ page: String(page), limit: String(limit) }));
}

export function useNotifications(page = 1, unread = false) {
  return useApiQuery(['notifications', page, String(unread)], () =>
    api.getNotifications({ page: String(page), unread: String(unread) }),
  );
}

export function useUnreadCount() {
  return useApiQuery(['notifications', 'unread'], () => api.getUnreadCount(), { refetchInterval: 30_000 });
}

// ─── Conversations ──────────────────────────────────────────────────────────

export function useConversations(page = 1) {
  return useApiQuery(['conversations', page], () => api.getConversations({ page: String(page) }));
}

export function useConversation(id: string) {
  return useApiQuery(['conversation', id], () => api.getConversation(id), { enabled: !!id });
}

export function useMessages(conversationId: string) {
  return useApiQuery(['messages', conversationId], () => api.getMessages(conversationId), { enabled: !!conversationId });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => api.sendMessage(id, { content }),
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: ['messages', id] }); qc.invalidateQueries({ queryKey: ['conversations'] }); },
    onError: () => toast.error('Failed to send message'),
  });
}

// ─── Providers & Models ─────────────────────────────────────────────────────

export function useProviders() {
  return useApiQuery(['providers'], () => api.getProviders());
}

export function useProviderStats() {
  return useApiQuery(['providers', 'stats'], () => api.getProviderStats());
}

export function useModels(params?: Record<string, string>) {
  return useApiQuery(['models', params], () => api.getAllModels(params));
}

export function useSyncModels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.syncModels(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['models'] }); toast.success('Models synchronized'); },
    onError: () => toast.error('Failed to sync models'),
  });
}

// ─── Workspaces ─────────────────────────────────────────────────────────────

export function useWorkspaces(page = 1) {
  return useApiQuery(['workspaces', page], () => api.getWorkspaces({ page: String(page) }));
}

// ─── API Keys ───────────────────────────────────────────────────────────────

export function useApiKeys() {
  return useApiQuery(['api-keys'], () => api.getApiKeys());
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.createApiKey(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['api-keys'] }); toast.success('API key created'); },
    onError: () => toast.error('Failed to create API key'),
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteApiKey(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['api-keys'] }); toast.success('API key revoked'); },
    onError: () => toast.error('Failed to revoke API key'),
  });
}

// ─── Billing ────────────────────────────────────────────────────────────────

export function usePlans() {
  return useApiQuery(['plans'], () => api.getPlans());
}

export function useSubscription() {
  return useApiQuery(['subscription'], () => api.getSubscription());
}

export function useInvoices(page = 1) {
  return useApiQuery(['invoices', page], () => api.getInvoices({ page: String(page) }));
}

export function useQuotas() {
  return useApiQuery(['quotas'], () => api.getQuotas());
}

// ─── Prompts ────────────────────────────────────────────────────────────────

export function usePrompts(page = 1) {
  return useApiQuery(['prompts', page], () => api.getPrompts({ page: String(page) }));
}

// ─── Audit ──────────────────────────────────────────────────────────────────

export function useAuditLogs(page = 1, limit = 50) {
  return useApiQuery(['audit', page, limit], () => api.getAuditLogs({ page: String(page), limit: String(limit) }));
}

// ─── Tools ──────────────────────────────────────────────────────────────────

export function useTools(category?: string) {
  return useApiQuery(['tools', category], () => api.getTools(category));
}

export function useToolStats() {
  return useApiQuery(['tools', 'stats'], () => api.getToolStats());
}

// ─── Health ─────────────────────────────────────────────────────────────────

export function useHealth() {
  return useApiQuery(['health'], () => api.getHealth(), { refetchInterval: 30_000 });
}

export function useDeepHealth() {
  return useApiQuery(['health', 'deep'], () => api.getDeepHealth(), { refetchInterval: 60_000 });
}
