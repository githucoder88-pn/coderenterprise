/**
 * App Store — UI state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppState {
  theme: 'dark' | 'light' | 'system';
  reducedMotion: boolean;
  hapticsEnabled: boolean;
  activeConversationId: string | null;
  activeWorkspaceId: string | null;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setReducedMotion: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  setActiveConversation: (id: string | null) => void;
  setActiveWorkspace: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      reducedMotion: false,
      hapticsEnabled: true,
      activeConversationId: null,
      activeWorkspaceId: null,
      setTheme: (theme) => set({ theme }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setActiveConversation: (id) => set({ activeConversationId: id }),
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
    }),
    { name: 'coder-app', storage: createJSONStorage(() => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} })) },
  ),
);
