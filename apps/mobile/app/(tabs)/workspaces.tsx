/**
 * Workspaces Screen — repository explorer, search, status.
 */
import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TextInput } from 'react-native';
import { useTheme } from '@/theme/theme';
import { HPressable } from '@/components/common/Pressable';
import { Icon } from '@/components/common/Icon';
import { Card } from '@/components/common/Card';
import { ScreenContainer } from '@/components/common/SafeLayout';
import { useWorkspaces } from '@/hooks/use-api';

export default function WorkspacesScreen() {
  const { data, isLoading, refetch } = useWorkspaces();
  const { colors, typography } = useTheme();
  const workspaces = (data as any)?.data ?? [];
  const [refreshing, setRefreshing] = React.useState(false);
  const [q, setQ] = React.useState('');
  const onRefresh = async () => { setRefreshing(true); await refetch?.(); setRefreshing(false); };

  const filtered = workspaces.filter((w: any) => !q || w.name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <ScreenContainer bg={colors.bgGrouped} padded={false}>
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 16, gap: 12 }}>
            <Text style={[typography.title2, { color: colors.text }]}>Workspaces</Text>
            <View style={[styles.search, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <Icon.ChevronRight size={16} color={colors.textTertiary} />
              <TextInput
                style={{ flex: 1, color: colors.text, fontSize: 15, paddingVertical: 10, paddingHorizontal: 6 }}
                placeholder="Search workspaces…"
                placeholderTextColor={colors.textTertiary}
                value={q}
                onChangeText={setQ}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 48 }}>
            <Icon.Folder size={48} color={colors.textTertiary} />
            <Text style={{ color: colors.textSecondary, marginTop: 12, fontWeight: '600' }}>No workspaces</Text>
            <Text style={{ color: colors.textTertiary, textAlign: 'center', marginTop: 4 }}>Connect a repository or directory to get started.</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }: any) => (
          <HPressable haptic="light" onPress={() => {}}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.iconBubble, { backgroundColor: colors.primarySoft }]}>
                  <Icon.Folder size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{item.name}</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                    {item.slug} · {item.memberCount ?? 0} members · {item.repositoryCount ?? 0} repos
                  </Text>
                </View>
                <Icon.ChevronRight size={16} color={colors.textTertiary} />
              </View>
            </Card>
          </HPressable>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 10 },
  iconBubble: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
