/**
 * Auth Store — Zustand
 */

import { create } from 'zustand';

interface User {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
  readonly photoURL: string | null;
  readonly organizationId: string;
  readonly role: string;
  readonly permissions: readonly string[];
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  setUser: (user) => set({ user, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  logout: () => set({ user: null, loading: false, error: null }),
}));
