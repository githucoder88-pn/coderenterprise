/**
 * Conversation Detail — chat with streaming
 */

import { View, Text, TextInput, FlatList, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useMessages } from '@/hooks/use-api';
import { useAppStore } from '@/stores/app-store';
import { api } from '@/services/api';

interface Msg { id: string; role: string; content: string; timestamp: Date }

export default function ConversationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useMessages(id);
  const isDark = useAppStore((s) => s.theme) === 'dark';
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const existing = (data as any)?.data ?? [];
    if (existing.length > 0) {
      setMessages(existing.map((m: any, i: number) => ({
        id: m.id ?? `m-${i}`, role: m.role, content: m.content, timestamp: new Date(m.createdAt),
      })));
    }
  }, [data]);

  const c = isDark ? { bg: '#0a0a0a', card: '#171717', border: '#262626', text: '#fafafa', sub: '#a3a3a3', accent: '#3b82f6', inputBg: '#1f1f1f' }
    : { bg: '#ffffff', card: '#f5f5f5', border: '#e5e5e5', text: '#0a0a0a', sub: '#737373', accent: '#2563eb', inputBg: '#f5f5f5' };

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: Msg = { id: `m-${Date.now()}`, role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    const assistantMsg: Msg = { id: `m-${Date.now()}-a`, role: 'assistant', content: '', timestamp: new Date() };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      for await (const chunk of api.streamMessage(id!, { content: userMsg.content })) {
        setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m));
      }
    } catch {
      setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, content: m.content || 'Error: failed to get response' } : m));
    }
    setStreaming(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <View style={[s.msg, item.role === 'user' ? s.userMsg : s.assistantMsg, { backgroundColor: item.role === 'user' ? c.accent : c.card }]}>
            <Text style={{ color: item.role === 'user' ? '#fff' : c.text, fontSize: 15, lineHeight: 22 }}>{item.content || '…'}</Text>
          </View>
        )}
      />

      <View style={[s.inputBar, { backgroundColor: c.bg, borderTopColor: c.border }]}>
        <TextInput
          style={[s.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message…"
          placeholderTextColor={c.sub}
          multiline
          maxLength={10000}
        />
        <Pressable
          style={[s.sendBtn, { backgroundColor: input.trim() ? c.accent : c.border }]}
          onPress={send}
          disabled={!input.trim() || streaming}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  msg: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  userMsg: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantMsg: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8, borderTopWidth: 1, position: 'absolute', bottom: 0, left: 0, right: 0 },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
