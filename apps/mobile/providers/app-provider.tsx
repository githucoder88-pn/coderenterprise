/**
 * AppProvider — composes all providers: query, theme, safe-area,
 * gesture handler root, offline sync, notification service.
 */
import React, { useEffect, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/theme';
import { InsetProvider } from '@/components/common/SafeLayout';
import { notificationService } from '@/notifications/service';
import { SyncManager } from '@/offline/sync';
import { secureStorage } from '@/security/secure-storage';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import { api } from '@/services/api';
import { useInvalidateOnFocus } from '@/hooks/use-cached-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
      gcTime: 1000 * 60 * 30,
    },
    mutations: {
      retry: 1,
    },
  },
});

function AuthBootstrapper({ children }: { children: ReactNode }) {
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const hapticsEnabled = useAppStore((s) => s.hapticsEnabled);

  useEffect(() => {
    (async () => {
      try {
        const token = await secureStorage.getToken();
        if (token) {
          setToken(token);
          try {
            const me = await api.me();
            if (me) setUser(me);
          } catch {}
        }
      } catch {}
      setLoading(false);
    })();
    SyncManager.init();
    notificationService.initialize().catch(() => {});
  }, []);

  useEffect(() => {
    const { setHapticsEnabled } = require('@/utils/haptics');
    setHapticsEnabled(hapticsEnabled);
  }, [hapticsEnabled]);

  useInvalidateOnFocus();
  return <>{children}</>;
}

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <InsetProvider>
              <AuthBootstrapper>{children}</AuthBootstrapper>
            </InsetProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
