/**
 * Agents Screen
 */

import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useAgents, useScheduleAgent } from '@/hooks/use-api';
import { useAppStore } from '@/stores/app-store';

const ROLES = ['planner', 'researcher', 'architect', 'coder', 'reviewer', 'tester', 'debugger', 'documenter'];

export default function AgentsScreen() {
  const { data } = useAgents();
  const scheduleAgent = useScheduleAgent();
  const isDark = useAppStore((s) => s.theme) === 'dark';
  const agents = (data as any)?.data ?? [];
  const c = isDark ? { bg: '#0a0a0a', card: '#171717', border: '#262626', text: '#fafafa', sub: '#a3a3a3', accent: '#3b82f6' }
    : { bg: '#ffffff', card: '#fafafa', border: '#e5e5e5', text: '#0a0a0a', sub: '#737373', accent: '#2563eb' };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={agents.length > 0 ? agents : ROLES.map((r) => ({ id: r, role: r, lifecycle: 'available' }))}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={<Text style={[s.header, { color: c.text }]}>Agent Types</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.name, { color: c.text }]}>{item.role}</Text>
            <Text style={[s.meta, { color: c.sub }]}>Status: {item.lifecycle ?? 'available'}</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '600', marginBottom: 4, textTransform: 'capitalize' },
  meta: { fontSize: 12 },
});
