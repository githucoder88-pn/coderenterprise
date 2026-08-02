/**
 * App Store — UI state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppState {
  theme: 'dark' | 'light';
  activeConversationId: string | null;
  activeWorkspaceId: string | null;
  setTheme: (theme: 'dark' | 'light') => void;
  setActiveConversation: (id: string | null) => void;
  setActiveWorkspace: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      activeConversationId: null,
      activeWorkspaceId: null,
      setTheme: (theme) => set({ theme }),
      setActiveConversation: (id) => set({ activeConversationId: id }),
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
    }),
    { name: 'coder-app', storage: createJSONStorage(() => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} })) },
  ),
);
