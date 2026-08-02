/**
 * Tab Layout — bottom navigation
 */

import { Tabs } from 'expo-router';
import { useAppStore } from '@/stores/app-store';

export default function TabLayout() {
  const isDark = useAppStore((s) => s.theme) === 'dark';
  const bg = isDark ? '#0a0a0a' : '#ffffff';
  const active = '#3b82f6';
  const inactive = isDark ? '#737373' : '#a3a3a3';

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: bg },
        headerTintColor: isDark ? '#fafafa' : '#0a0a0a',
        tabBarStyle: { backgroundColor: bg, borderTopColor: isDark ? '#262626' : '#e5e5e5' },
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => null }} />
      <Tabs.Screen name="conversations" options={{ title: 'Chat', tabBarIcon: () => null }} />
      <Tabs.Screen name="workspaces" options={{ title: 'Workspaces', tabBarIcon: () => null }} />
      <Tabs.Screen name="agents" options={{ title: 'Agents', tabBarIcon: () => null }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: () => null }} />
    </Tabs>
  );
}
