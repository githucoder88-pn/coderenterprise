/**
 * Home Screen — dashboard overview.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useLayout } from '@/utils/responsive';
import { Card } from '@/components/common/Card';
import { HPressable } from '@/components/common/Pressable';
import { Icon } from '@/components/common/Icon';
import { useUsage, useConversations, useHealth, useUnreadCount } from '@/hooks/use-api';
import { SkeletonBlock } from '@/components/skeleton/Shimmer';
import { ScreenContainer } from '@/components/common/SafeLayout';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { api } from '@/services/api';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function StatTile({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Card style={styles.stat}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={[styles.iconBubble, { backgroundColor: color + '22' }]}>{icon}</View>
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textTertiary }]}>{label}</Text>
    </Card>
  );
}

function QuickAction({ label, icon, onPress }: { label: string; icon: React.ReactNode; onPress: () => void }) {
  const { colors, radius } = useTheme();
  return (
    <HPressable onPress={onPress} style={{ flex: 1, minWidth: '45%' }}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[styles.iconBubble, { backgroundColor: colors.primarySoft }]}>{icon}</View>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 }}>{label}</Text>
        <Icon.ChevronRight size={16} color={colors.textTertiary} />
      </Card>
    </HPressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const layout = useLayout();

  const { data: usage, isLoading: loadingUsage, refetch: refetchUsage } = useCachedQuery(['usage'], () => api.getUsage());
  const { data: convs, isLoading: loadingConvs, refetch: refetchConvs } = useCachedQuery(['conversations', 1], () => api.getConversations(1));
  const { data: health, isLoading: loadingHealth, refetch: refetchHealth } = useCachedQuery(['health'], () => api.health());
  const { data: unread, isLoading: loadingUnread, refetch: refetchUnread } = useCachedQuery(['unread'], () => api.getUnreadCount());

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchUsage(), refetchConvs(), refetchHealth(), refetchUnread()]).catch(() => {});
    setRefreshing(false);
  }, [refetchUsage, refetchConvs, refetchHealth, refetchUnread]);

  const summary = (usage as any)?.currentPeriod;
  const totalConvs = (convs as any)?.pagination?.total ?? 0;
  const isHealthy = (health as any)?.status === 'ok';

  return (
    <ScreenContainer
      padded
      bg={colors.bgGrouped}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: layout.gutter, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={!layout.isTablet}
      >
        {/* Greeting */}
        <View style={{ marginBottom: spacing['5'], marginTop: spacing['2'] }}>
          <Text style={[typography.largeTitle, { color: colors.text }]}>CODER</Text>
          <Text style={[typography.callout, { color: colors.textSecondary }]}>Enterprise AI · Ready to assist</Text>
        </View>

        {/* Stats */}
        <View style={styles.grid}>
          {loadingUsage ? (
            <>
              <Card style={styles.stat}><SkeletonBlock width="60%" height={14} /><SkeletonBlock width="80%" height={24} /></Card>
              <Card style={styles.stat}><SkeletonBlock width="60%" height={14} /><SkeletonBlock width="80%" height={24} /></Card>
              <Card style={styles.stat}><SkeletonBlock width="60%" height={14} /><SkeletonBlock width="80%" height={24} /></Card>
              <Card style={styles.stat}><SkeletonBlock width="60%" height={14} /><SkeletonBlock width="80%" height={24} /></Card>
            </>
          ) : (
            <>
              <StatTile label="Requests" value={formatNumber(summary?.totalRequests ?? 0)} color={colors.primary} icon={<Icon.Bolt size={16} color={colors.primary} />} />
              <StatTile label="Tokens" value={formatNumber(summary?.totalTokens ?? 0)} color={colors.success} icon={<Icon.Sparkles size={16} color={colors.success} />} />
              <StatTile label="Cost" value={`$${(summary?.totalCost ?? 0).toFixed(2)}`} color={colors.warning} icon={<Icon.Globe size={16} color={colors.warning} />} />
              <StatTile label="Chats" value={String(totalConvs)} color="#a855f7" icon={<Icon.Chat size={16} color="#a855f7" />} />
            </>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={[typography.headline, { color: colors.text, marginTop: spacing['6'], marginBottom: spacing['3'] }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickAction label="New Chat" icon={<Icon.Send size={16} color={colors.primary} />} onPress={() => router.push('/conversations')} />
          <QuickAction label="Workspaces" icon={<Icon.Folder size={16} color={colors.primary} />} onPress={() => router.push('/workspaces')} />
          <QuickAction label="Agents" icon={<Icon.Users size={16} color={colors.primary} />} onPress={() => router.push('/agents')} />
          <QuickAction label="Models" icon={<Icon.Cpu size={16} color={colors.primary} />} onPress={() => router.push('/more')} />
        </View>

        {/* Status */}
        <Text style={[typography.headline, { color: colors.text, marginTop: spacing['6'], marginBottom: spacing['3'] }]}>System Status</Text>
        <Card>
          <StatusRow label="API Health" value={loadingHealth ? '…' : (health as any)?.status ?? 'unknown'} ok={isHealthy} colors={colors} />
          <View style={[styles.sep, { backgroundColor: colors.separator }]} />
          <StatusRow label="Uptime" value={`${formatNumber((health as any)?.uptime ?? 0)}s`} colors={colors} />
          <View style={[styles.sep, { backgroundColor: colors.separator }]} />
          <StatusRow label="Unread" value={String((unread as any)?.count ?? 0)} colors={colors} />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

function StatusRow({ label, value, ok, colors }: { label: string; value: string; ok?: boolean; colors: any }) {
  return (
    <View style={styles.statusRow}>
      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {ok !== undefined && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ok ? colors.success : colors.danger }} />}
        <Text style={{ color: ok !== undefined ? (ok ? colors.success : colors.danger) : colors.text, fontWeight: '600', fontSize: 14, textTransform: 'capitalize' }}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '48%', gap: 4 },
  value: { fontSize: 24, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '600' },
  iconBubble: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  sep: { height: StyleSheet.hairlineWidth },
});
