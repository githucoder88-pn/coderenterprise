/**
 * Root Layout — providers, theme, tab navigation
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '@/stores/app-store';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 2 } },
});

export default function RootLayout() {
  const theme = useAppStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: isDark ? '#0a0a0a' : '#ffffff' },
            headerTintColor: isDark ? '#fafafa' : '#0a0a0a',
            headerTitleStyle: { fontWeight: '600', fontSize: 17 },
            contentStyle: { backgroundColor: isDark ? '#0a0a0a' : '#ffffff' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="conversation/[id]" options={{ title: 'Conversation' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="account" options={{ title: 'Account' }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
