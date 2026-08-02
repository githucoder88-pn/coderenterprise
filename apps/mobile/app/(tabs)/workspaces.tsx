/**
 * Workspaces Screen
 */

import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useWorkspaces } from '@/hooks/use-api';
import { useAppStore } from '@/stores/app-store';

export default function WorkspacesScreen() {
  const { data } = useWorkspaces();
  const isDark = useAppStore((s) => s.theme) === 'dark';
  const workspaces = (data as any)?.data ?? [];
  const c = isDark ? { bg: '#0a0a0a', card: '#171717', border: '#262626', text: '#fafafa', sub: '#a3a3a3', accent: '#3b82f6' }
    : { bg: '#ffffff', card: '#fafafa', border: '#e5e5e5', text: '#0a0a0a', sub: '#737373', accent: '#2563eb' };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={workspaces}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={{ color: c.sub, textAlign: 'center', marginTop: 40 }}>No workspaces</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.name, { color: c.text }]}>{item.name}</Text>
            <Text style={[s.meta, { color: c.sub }]}>{item.slug} · {item.memberCount ?? 0} members</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 12 },
});
