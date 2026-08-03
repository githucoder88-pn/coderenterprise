/**
 * Tab Layout — adaptive bottom navigation with auth guard.
 */
import React from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { TabIcon } from '@/components/common/TabIcon';
import { BlurView } from 'expo-blur';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/auth-store';
import { OfflineBanner } from '@/components/common/OfflineBanner';

export default function TabLayout() {
  const { colors, scheme } = useTheme();
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const segments = useSegments();

  React.useEffect(() => {
    if (!loading && !isAuth) {
      // Only redirect if we aren't already on the auth route
      const inAuthGroup = segments[0] === 'auth';
      if (!inAuthGroup) router.replace('/auth');
    }
  }, [isAuth, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { color: colors.text, fontWeight: '700', fontSize: 22 },
          headerShadowVisible: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarStyle: {
            position: Platform.OS === 'ios' ? 'absolute' : undefined,
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.tabBar,
            borderTopColor: colors.separator,
            borderTopWidth: StyleSheet.hairlineWidth,
            elevation: 0,
            height: 62,
            paddingTop: 4,
          },
          tabBarBackground: Platform.OS === 'ios' ? () => (
            <BlurView tint={scheme === 'dark' ? 'systemThinMaterialDark' : 'systemThinMaterialLight'} intensity={90} style={StyleSheet.absoluteFill} />
          ) : undefined,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', headerTitle: 'CODER', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="Home" label="Home" /> }} />
        <Tabs.Screen name="conversations" options={{ title: 'Chat', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="Chat" label="Chat" /> }} />
        <Tabs.Screen name="workspaces" options={{ title: 'Workspaces', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="Folder" label="Workspaces" /> }} />
        <Tabs.Screen name="agents" options={{ title: 'Agents', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="Users" label="Agents" /> }} />
        <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="Menu" label="More" /> }} />
      </Tabs>
      <OfflineBanner />
    </>
  );
}
