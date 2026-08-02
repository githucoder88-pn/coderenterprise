/**
 * App Store — Global desktop application state
 */

import { create } from 'zustand';

export type Panel = 'sidebar' | 'editor' | 'terminal' | 'chat';

interface AppState {
  activePanel: Panel;
  sidebarVisible: boolean;
  terminalVisible: boolean;
  chatVisible: boolean;
  theme: 'dark' | 'light';
  activeWorkspaceId: string | null;
  activeConversationId: string | null;
  setActivePanel: (panel: Panel) => void;
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  toggleChat: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setActiveWorkspace: (id: string | null) => void;
  setActiveConversation: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activePanel: 'editor',
  sidebarVisible: true,
  terminalVisible: false,
  chatVisible: true,
  theme: 'dark',
  activeWorkspaceId: null,
  activeConversationId: null,
  setActivePanel: (panel) => set({ activePanel: panel }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  toggleTerminal: () => set((s) => ({ terminalVisible: !s.terminalVisible })),
  toggleChat: () => set((s) => ({ chatVisible: !s.chatVisible })),
  setTheme: (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    set({ theme });
  },
  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
}));
