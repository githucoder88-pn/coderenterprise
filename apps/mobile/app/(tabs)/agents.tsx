/**
 * Agents Screen — agent dashboard with status, timelines, and quick actions.
 */
import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/theme';
import { HPressable } from '@/components/common/Pressable';
import { Icon } from '@/components/common/Icon';
import { Card } from '@/components/common/Card';
import { ScreenContainer } from '@/components/common/SafeLayout';
import { useAgents } from '@/hooks/use-api';
import { formatDistanceToNow } from 'date-fns';

const ROLE_ICONS: Record<string, string> = {
  planner: '🎯', researcher: '🔎', architect: '🏗️', coder: '💻', reviewer: '👀',
  tester: '🧪', debugger: '🐛', documenter: '📝',
};

const ROLES = ['planner', 'researcher', 'architect', 'coder', 'reviewer', 'tester', 'debugger', 'documenter'];

export default function AgentsScreen() {
  const { data, isLoading, refetch } = useAgents();
  const { colors, typography, spacing } = useTheme();
  const agents = (data as any)?.data ?? [];
  const list = agents.length > 0 ? agents : ROLES.map((r) => ({ id: r, role: r, lifecycle: 'available' }));
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => { setRefreshing(true); await refetch?.(); setRefreshing(false); };

  return (
    <ScreenContainer bg={colors.bgGrouped} padded={false}>
      <FlatList
        data={list}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Text style={[typography.title2, { color: colors.text }]}>Agent Team</Text>
            <Text style={[typography.callout, { color: colors.textSecondary }]}>
              Orchestrate multi-agent workflows
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }: any) => {
          const status = item.lifecycle ?? 'available';
          const active = status === 'running' || status === 'active';
          return (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.avatar}>
                  <Text style={{ fontSize: 22 }}>{ROLE_ICONS[item.role] ?? '🤖'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]}>{item.role}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.dot, { backgroundColor: active ? colors.success : colors.textTertiary }]} />
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      {active ? 'Working' : 'Available'}
                      {item.startedAt ? ` · ${formatDistanceToNow(new Date(item.startedAt), { addSuffix: true })}` : ''}
                    </Text>
                  </View>
                </View>
                <HPressable
                  haptic="light"
                  onPress={() => {}}
                  style={[styles.launch, { backgroundColor: colors.primarySoft }]}
                >
                  <Icon.Play size={14} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Run</Text>
                </HPressable>
              </View>
            </Card>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '700', marginBottom: 4, textTransform: 'capitalize' },
  meta: { fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  launch: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
});
