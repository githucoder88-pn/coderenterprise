'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

// Auth
export function useSignIn() {
  const { setUser, setToken } = useAuthStore();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => api.signIn(body),
    onSuccess: (data) => {
      setUser(data.user);
      if (data.tokens?.accessToken) setToken(data.tokens.accessToken);
    },
  });
}

export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: () => api.getProfile(), retry: false });
}

// Conversations
export function useConversations(page = 1) {
  return useQuery({ queryKey: ['conversations', page], queryFn: () => api.getConversations(page) });
}

export function useMessages(id: string) {
  return useQuery({ queryKey: ['messages', id], queryFn: () => api.getMessages(id), enabled: !!id });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.createConversation(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

// Providers & Models
export function useProviders() {
  return useQuery({ queryKey: ['providers'], queryFn: () => api.getProviders() });
}

export function useModels(params?: Record<string, string>) {
  return useQuery({ queryKey: ['models', params], queryFn: () => api.getModels(params) });
}

// Workspaces
export function useWorkspaces() {
  return useQuery({ queryKey: ['workspaces'], queryFn: () => api.getWorkspaces() });
}

// Agents
export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: () => api.getAgents() });
}

export function useScheduleAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.scheduleAgent(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
}

// Notifications
export function useNotifications(page = 1) {
  return useQuery({ queryKey: ['notifications', page], queryFn: () => api.getNotifications(page) });
}

export function useUnreadCount() {
  return useQuery({ queryKey: ['unread'], queryFn: () => api.getUnreadCount(), refetchInterval: 30000 });
}

// Billing
export function useUsage() {
  return useQuery({ queryKey: ['usage'], queryFn: () => api.getUsage() });
}

export function useSubscription() {
  return useQuery({ queryKey: ['subscription'], queryFn: () => api.getSubscription() });
}

export function usePlans() {
  return useQuery({ queryKey: ['plans'], queryFn: () => api.getPlans() });
}

export function useInvoices() {
  return useQuery({ queryKey: ['invoices'], queryFn: () => api.getInvoices() });
}

// Extensions
export function useExtensions() {
  return useQuery({ queryKey: ['extensions'], queryFn: () => api.getExtensions() });
}

// Tools
export function useTools(category?: string) {
  return useQuery({ queryKey: ['tools', category], queryFn: () => api.getTools(category) });
}

// Health
export function useHealth() {
  return useQuery({ queryKey: ['health'], queryFn: () => api.health(), refetchInterval: 30000 });
}
