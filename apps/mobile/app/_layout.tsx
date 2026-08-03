/**
 * Root Layout — providers, theme, stack navigation.
 */
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '@/providers/app-provider';
import { useTheme } from '@/theme/theme';
import { useAppStore } from '@/stores/app-store';

function RootStack() {
  const { colors, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700', fontSize: 17, color: colors.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
          headerBackTitleVisible: false,
          headerLargeTitleShadowVisible: false,
          animation: 'default',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="conversation/[id]" options={{ title: 'Conversation', headerBackTitle: 'Back' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
        <Stack.Screen name="account" options={{ title: 'Account' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootStack />
    </AppProvider>
  );
}
