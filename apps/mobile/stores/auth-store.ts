/**
 * Auth Store
 */
import { create } from 'zustand';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  organizationId: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user, loading: false }),
  setToken: (token) => set({ token }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null, token: null, isAuthenticated: false, loading: false }),
}));
