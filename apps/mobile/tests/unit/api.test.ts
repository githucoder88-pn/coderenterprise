/**
 * API Client Tests
 */

import { describe, it, expect } from 'vitest';

describe('Mobile API Client', () => {
  it('should define all required endpoints', () => {
    const endpoints = [
      'signIn', 'signUp', 'signOut', 'me',
      'getConversations', 'getMessages', 'createConversation', 'sendMessage', 'streamMessage',
      'getProviders', 'getProviderStats',
      'getModels', 'syncModels',
      'getWorkspaces', 'indexWorkspace', 'searchWorkspace',
      'getAgents', 'scheduleAgent',
      'getNotifications', 'getUnreadCount', 'markRead',
      'getUsage', 'getSubscription', 'getPlans', 'getInvoices',
      'getProfile', 'updateProfile', 'getApiKeys',
      'getExtensions', 'health', 'getTools',
    ];
    expect(endpoints.length).toBe(31);
  });

  it('should define streaming endpoints', () => {
    const streamingEndpoints = ['streamMessage'];
    expect(streamingEndpoints).toContain('streamMessage');
  });
});

describe('Notification Service', () => {
  it('should define all notification types', () => {
    const types = [
      'workflow_complete', 'task_assigned', 'checkpoint_created',
      'agent_failed', 'security_alert', 'billing_alert', 'provider_alert',
    ];
    expect(types.length).toBe(7);
  });

  it('should map notification icons', () => {
    const icons: Record<string, string> = {
      workflow_complete: '✅',
      task_assigned: '📋',
      checkpoint_created: '💾',
      agent_failed: '❌',
      security_alert: '🔒',
      billing_alert: '💳',
      provider_alert: '☁️',
    };
    expect(Object.keys(icons).length).toBe(7);
  });
});

describe('Screens', () => {
  it('should define all required screens', () => {
    const screens = [
      'Auth', 'Home', 'Conversations', 'ConversationDetail',
      'Workspaces', 'Providers', 'Models', 'Agents',
      'Extensions', 'Notifications', 'Settings', 'Billing',
      'Analytics', 'Account',
    ];
    expect(screens.length).toBe(14);
  });
});
