import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';

describe('AuthStore', () => {
  beforeEach(() => { useAuthStore.setState({ user: null, loading: true, error: null }); });

  it('should set user', () => {
    useAuthStore.getState().setUser({ uid: '1', email: 'test@test.com', displayName: 'Test', photoURL: null, organizationId: 'org-1', role: 'admin', permissions: ['admin:all'] });
    expect(useAuthStore.getState().user?.email).toBe('test@test.com');
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('should clear user on logout', () => {
    useAuthStore.getState().setUser({ uid: '1', email: 'test@test.com', displayName: 'Test', photoURL: null, organizationId: 'org-1', role: 'admin', permissions: [] });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('should set loading', () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('should set error', () => {
    useAuthStore.getState().setError('Something went wrong');
    expect(useAuthStore.getState().error).toBe('Something went wrong');
    expect(useAuthStore.getState().loading).toBe(false);
  });
});

describe('UIStore', () => {
  it('should toggle sidebar', () => {
    const initial = useUIStore.getState().sidebarCollapsed;
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(!initial);
  });

  it('should toggle command palette', () => {
    useUIStore.getState().setCommandPaletteOpen(true);
    expect(useUIStore.getState().commandPaletteOpen).toBe(true);
    useUIStore.getState().toggleCommandPalette();
    expect(useUIStore.getState().commandPaletteOpen).toBe(false);
  });

  it('should set theme', () => {
    useUIStore.getState().setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('should set active workspace', () => {
    useUIStore.getState().setActiveWorkspace('ws-1');
    expect(useUIStore.getState().activeWorkspaceId).toBe('ws-1');
  });
});
