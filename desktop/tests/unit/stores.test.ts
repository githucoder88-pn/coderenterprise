/**
 * Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../renderer/stores/app-store.js';

describe('AppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      activePanel: 'editor', sidebarVisible: true, terminalVisible: false,
      chatVisible: true, theme: 'dark', activeWorkspaceId: null, activeConversationId: null,
    });
  });

  it('should toggle sidebar', () => {
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarVisible).toBe(false);
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarVisible).toBe(true);
  });

  it('should toggle terminal', () => {
    useAppStore.getState().toggleTerminal();
    expect(useAppStore.getState().terminalVisible).toBe(true);
  });

  it('should toggle chat', () => {
    useAppStore.getState().toggleChat();
    expect(useAppStore.getState().chatVisible).toBe(false);
  });

  it('should set active panel', () => {
    useAppStore.getState().setActivePanel('terminal');
    expect(useAppStore.getState().activePanel).toBe('terminal');
  });

  it('should set theme', () => {
    useAppStore.getState().setTheme('light');
    expect(useAppStore.getState().theme).toBe('light');
  });

  it('should set active workspace', () => {
    useAppStore.getState().setActiveWorkspace('ws-1');
    expect(useAppStore.getState().activeWorkspaceId).toBe('ws-1');
  });

  it('should set active conversation', () => {
    useAppStore.getState().setActiveConversation('conv-1');
    expect(useAppStore.getState().activeConversationId).toBe('conv-1');
  });
});
