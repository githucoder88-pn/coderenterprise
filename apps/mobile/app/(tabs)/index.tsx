/**
 * Home Screen — dashboard overview
 */

import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useUsage, useConversations, useHealth, useUnreadCount } from '@/hooks/use-api';
import { useAppStore } from '@/stores/app-store';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function HomeScreen() {
  const router = useRouter();
  const isDark = useAppStore((s) => s.theme) === 'dark';
  const { data: usage } = useUsage();
  const { data: convs } = useConversations();
  const { data: health } = useHealth();
  const { data: unread } = useUnreadCount();

  const summary = (usage as any)?.currentPeriod;
  const c = isDark ? { bg: '#0a0a0a', card: '#171717', border: '#262626', text: '#fafafa', sub: '#a3a3a3', muted: '#737373', accent: '#3b82f6', green: '#22c55e' }
    : { bg: '#ffffff', card: '#fafafa', border: '#e5e5e5', text: '#0a0a0a', sub: '#737373', muted: '#a3a3a3', accent: '#2563eb', green: '#16a34a' };

  const cards = [
    { label: 'Requests', value: formatNumber(summary?.totalRequests ?? 0), color: c.accent },
    { label: 'Tokens', value: formatNumber(summary?.totalTokens ?? 0), color: c.green },
    { label: 'Cost', value: `$${(summary?.totalCost ?? 0).toFixed(2)}`, color: '#eab308' },
    { label: 'Conversations', value: String((convs as any)?.pagination?.total ?? 0), color: '#a855f7' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16 }}>
      {/* Stats Grid */}
      <View style={s.grid}>
        {cards.map((card) => (
          <View key={card.label} style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.cardLabel, { color: c.muted }]}>{card.label}</Text>
            <Text style={[s.cardValue, { color: card.color }]}>{card.value}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={[s.section, { color: c.text }]}>Quick Actions</Text>
      <View style={s.actions}>
        {[
          { label: 'New Chat', route: '/conversations' },
          { label: 'Workspaces', route: '/workspaces' },
          { label: 'Agents', route: '/agents' },
          { label: 'Models', route: '/(tabs)/more' },
        ].map((a) => (
          <Pressable key={a.label} style={[s.action, { backgroundColor: c.card, borderColor: c.border }]} onPress={() => router.push(a.route)}>
            <Text style={[s.actionText, { color: c.text }]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Status */}
      <Text style={[s.section, { color: c.text }]}>System Status</Text>
      <View style={[s.statusCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={s.statusRow}>
          <Text style={[s.statusLabel, { color: c.sub }]}>API Health</Text>
          <Text style={{ color: (health as any)?.status === 'ok' ? c.green : '#ef4444', fontWeight: '600' }}>
            {(health as any)?.status ?? 'checking…'}
          </Text>
        </View>
        <View style={s.statusRow}>
          <Text style={[s.statusLabel, { color: c.sub }]}>Uptime</Text>
          <Text style={{ color: c.text }}>{formatNumber((health as any)?.uptime ?? 0)}s</Text>
        </View>
        <View style={s.statusRow}>
          <Text style={[s.statusLabel, { color: c.sub }]}>Unread</Text>
          <Text style={{ color: c.text }}>{(unread as any)?.count ?? 0}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  card: { width: '48%', padding: 16, borderRadius: 12, borderWidth: 1 },
  cardLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: '700' },
  section: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  action: { width: '48%', padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  actionText: { fontSize: 14, fontWeight: '500' },
  statusCard: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: 14 },
});
