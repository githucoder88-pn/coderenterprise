/**
 * Conversations Screen — list with new conversation, pull-to-refresh, infinite pagination.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useTheme } from '@/theme/theme';
import { useCreateConversation } from '@/hooks/use-api';
import { HPressable } from '@/components/common/Pressable';
import { Icon } from '@/components/common/Icon';
import { Card } from '@/components/common/Card';
import { ScreenContainer } from '@/components/common/SafeLayout';
import { MessageSkeleton } from '@/components/skeleton/Shimmer';
import { HapticsService } from '@/utils/haptics';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/services/api';
import { useCachedQuery } from '@/hooks/use-cached-query';

interface ConvItem {
  id: string;
  title: string;
  model?: string;
  provider?: string;
  messageCount?: number;
  updatedAt?: string;
  createdAt?: string;
}

export default function ConversationsScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const qc = useQueryClient();
  const [allConvs, setAllConvs] = useState<ConvItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['conversations-infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.getConversations(pageParam);
      return { ...res, page: pageParam };
    },
    initialPageParam: 1,
    getNextPageParam: (last: any) => last?.pagination?.hasMore ? (last.page ?? 1) + 1 : undefined,
  });
  const createMut = useCreateConversation();

  React.useEffect(() => {
    if (data?.pages) {
      const all = data.pages.flatMap((p: any) => p?.data ?? []);
      setAllConvs(all);
    }
  }, [data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    HapticsService.press();
    await qc.invalidateQueries({ queryKey: ['conversations'] });
    setRefreshing(false);
  }, [qc]);

  const handleNew = async () => {
    HapticsService.medium();
    const result = await createMut.mutateAsync({
      model: 'gpt-4o', provider: 'openai', title: 'New Conversation',
    });
    if (result?.id) router.push(`/conversation/${result.id}`);
  };

  const onEndReached = () => {
    if (!isFetchingNextPage && (data?.pages?.[(data?.pages?.length ?? 1) - 1] as any)?.pagination?.hasMore) {
      fetchNextPage?.();
    }
  };

  const loading = isLoading && allConvs.length === 0;

  return (
    <ScreenContainer bg={colors.bgGrouped} padded={false} keyboardAware={false}>
      <View style={{ flex: 1 }}>
        {/* New conv FAB header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <HPressable onPress={handleNew} style={[styles.newBtn, { backgroundColor: colors.primary }]}>
            <Icon.Plus size={18} color="#fff" />
            <Text style={styles.newBtnText}>New Conversation</Text>
          </HPressable>
        </View>

        {loading ? (
          <View style={{ padding: 16 }}>
            {[1,2,3,4].map((i) => (
              <Card key={i} style={{ marginBottom: 8 }}>
                <View style={{ height: 16, backgroundColor: colors.skeletonBase, borderRadius: 4, width: '70%', marginBottom: 8 }} />
                <View style={{ height: 12, backgroundColor: colors.skeletonBase, borderRadius: 4, width: '40%' }} />
              </Card>
            ))}
          </View>
        ) : (
          <FlatList
            data={allConvs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', padding: 48, gap: 12 }}>
                <Icon.Chat size={48} color={colors.textTertiary} />
                <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '600' }}>No conversations yet</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 14, textAlign: 'center' }}>Start a new conversation with CODER to begin working.</Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <HPressable onPress={() => router.push(`/conversation/${item.id}`)} haptic="light">
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
                      <Icon.Chat size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                      <Text style={[styles.meta, { color: colors.textTertiary }]}>
                        {item.model ?? 'gpt-4o'} · {item.messageCount ?? 0} messages
                        {item.updatedAt ? ` · ${formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}` : ''}
                      </Text>
                    </View>
                    <Icon.ChevronRight size={16} color={colors.textTertiary} />
                  </View>
                </Card>
              </HPressable>
            )}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  newBtn: { flexDirection: 'row', gap: 8, padding: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  title: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  meta: { fontSize: 12 },
  avatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
