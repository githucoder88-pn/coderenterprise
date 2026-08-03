/**
 * Conversations Screen — list with new conversation
 */

import { View, Text, FlatList, Pressable, TextInput, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useConversations, useCreateConversation } from '@/hooks/use-api';
import { useAppStore } from '@/stores/app-store';

export default function ConversationsScreen() {
  const router = useRouter();
  const isDark = useAppStore((s) => s.theme) === 'dark';
  const { data } = useConversations();
  const createMut = useCreateConversation();
  const conversations = (data as any)?.data ?? [];

  const c = isDark ? { bg: '#0a0a0a', card: '#171717', border: '#262626', text: '#fafafa', sub: '#a3a3a3', accent: '#3b82f6' }
    : { bg: '#ffffff', card: '#fafafa', border: '#e5e5e5', text: '#0a0a0a', sub: '#737373', accent: '#2563eb' };

  const handleNew = async () => {
    const result = await createMut.mutateAsync({
      model: 'gpt-4o', provider: 'openai', title: 'New Conversation',
    });
    if (result?.id) router.push(`/conversation/${result.id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <Pressable style={[s.newBtn, { backgroundColor: c.accent, marginBottom: 16 }]} onPress={handleNew}>
            <Text style={s.newBtnText}>+ New Conversation</Text>
          </Pressable>
        }
        ListEmptyComponent={
          <Text style={{ color: c.sub, textAlign: 'center', marginTop: 40 }}>No conversations yet</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[s.item, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => router.push(`/conversation/${item.id}`)}
          >
            <Text style={[s.title, { color: c.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[s.meta, { color: c.sub }]}>{item.model} · {item.messageCount ?? 0} messages</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  newBtn: { padding: 14, borderRadius: 10, alignItems: 'center' },
  newBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  item: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  title: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 12 },
});
