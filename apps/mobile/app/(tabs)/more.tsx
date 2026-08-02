/**
 * More Screen — settings, providers, models, billing, extensions, notifications
 */

import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/stores/app-store';

const SECTIONS = [
  { label: 'Providers', description: 'AI provider connections', route: '/(tabs)/more' },
  { label: 'Models', description: 'Model registry', route: '/(tabs)/more' },
  { label: 'Extensions', description: 'Installed extensions', route: '/(tabs)/more' },
  { label: 'Notifications', description: 'Alert preferences', route: '/(tabs)/more' },
  { label: 'Billing', description: 'Plans & usage', route: '/(tabs)/more' },
  { label: 'Analytics', description: 'Usage analytics', route: '/(tabs)/more' },
  { label: 'Account', description: 'Profile & security', route: '/account' },
  { label: 'Settings', description: 'App preferences', route: '/settings' },
];

export default function MoreScreen() {
  const router = useRouter();
  const isDark = useAppStore((s) => s.theme) === 'dark';
  const c = isDark ? { bg: '#0a0a0a', card: '#171717', border: '#262626', text: '#fafafa', sub: '#a3a3a3' }
    : { bg: '#ffffff', card: '#fafafa', border: '#e5e5e5', text: '#0a0a0a', sub: '#737373' };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={SECTIONS}
        keyExtractor={(item) => item.label}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Pressable style={[s.item, { backgroundColor: c.card, borderColor: c.border }]} onPress={() => router.push(item.route)}>
            <Text style={[s.label, { color: c.text }]}>{item.label}</Text>
            <Text style={[s.desc, { color: c.sub }]}>{item.description}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  item: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  desc: { fontSize: 12 },
});
