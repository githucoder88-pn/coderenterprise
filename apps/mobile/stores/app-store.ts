/**
 * App Store — UI state
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type ThemePref = 'dark' | 'light' | 'system';

interface AppState {
  theme: ThemePref;
  activeConversationId: string | null;
  activeWorkspaceId: string | null;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  setTheme: (theme: ThemePref) => void;
  setActiveConversation: (id: string | null) => void;
  setActiveWorkspace: (id: string | null) => void;
  setHapticsEnabled: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
}

const memoryStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      activeConversationId: null,
      activeWorkspaceId: null,
      hapticsEnabled: true,
      reducedMotion: false,
      setTheme: (theme) => set({ theme }),
      setActiveConversation: (id) => set({ activeConversationId: id }),
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    {
      name: 'coder-app',
      storage: createJSONStorage(() => {
        try {
          const MMKV = require('react-native-mmkv');
          const store = new MMKV.MMKV({ id: 'coder-settings' });
          return {
            getItem: (name: string) => {
              const v = store.getString(name);
              return v ?? null;
            },
            setItem: (name: string, value: string) => store.set(name, value),
            removeItem: (name: string) => store.delete(name),
          };
        } catch {
          return memoryStorage;
        }
      }),
    },
  ),
);
