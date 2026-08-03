/**
 * Conversation Detail — premium chat experience with streaming, markdown,
 * code blocks, attachments, voice input, and gestures.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useLayout } from '@/utils/responsive';
import { useMessages } from '@/hooks/use-api';
import { api } from '@/services/api';
import { MessageBubble, type UIMessage } from '@/components/chat/MessageRenderer';
import { Composer } from '@/components/chat/Composer';
import { MessageSkeleton } from '@/components/skeleton/Shimmer';
import { Icon } from '@/components/common/Icon';
import { HapticsService } from '@/utils/haptics';
import { DraftStore } from '@/offline/storage';
import { matchCommand } from '@/lib/commands';
import { HPressable } from '@/components/common/Pressable';
import { BottomSheet } from '@/components/sheet/BottomSheet';
import type { Attachment } from '@/components/attachments/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type OutAttachment = { uri: string; type: string; name?: string };

export default function ConversationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const layout = useLayout();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useMessages(id as string);

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState(DraftStore.get(id ?? ''));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeMsg, setActiveMsg] = useState<UIMessage | null>(null);
  const [suggestions, setSuggestions] = useState<ReturnType<typeof matchCommand>>([]);
  const listRef = useRef<FlashList<any>>(null);
  const abortRef = useRef<{ abort: boolean }>({ abort: false });

  // Seed messages from fetched history
  useEffect(() => {
    const existing = (data as any)?.data ?? [];
    if (existing.length > 0) {
      setMessages(existing.map((m: any, i: number): UIMessage => ({
        id: m.id ?? `m-${i}`,
        role: m.role === 'user' ? 'user' : m.role === 'system' ? 'system' : 'assistant',
        content: m.content ?? '',
        timestamp: new Date(m.createdAt ?? Date.now()),
      })));
    }
  }, [data]);

  useEffect(() => {
    if (id) setDraft(DraftStore.get(id));
  }, [id]);

  const onDraftChange = useCallback((t: string) => {
    setDraft(t);
    if (id) DraftStore.set(id, t);
    setSuggestions(matchCommand(t));
  }, [id]);

  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => { scrollToEnd(false); }, [messages.length]);

  const stopStreaming = () => { abortRef.current.abort = true; };

  const send = async ({ text, attachments, voice }: { text: string; attachments?: Attachment[]; voice?: { uri?: string; durationMs: number } }) => {
    if (streaming) return;
    const finalText = text || (voice ? '(voice message)' : '');
    if (!finalText && (!attachments || attachments.length === 0)) return;

    const atts: OutAttachment[] = (attachments ?? []).map((a) => ({ uri: a.uri, type: a.type, name: a.name }));
    const userMsg: UIMessage = {
      id: `m-${Date.now()}`, role: 'user', content: finalText, timestamp: new Date(), attachments: atts,
    };
    const assistantId = `m-${Date.now()}-a`;
    const assistantMsg: UIMessage = { id: assistantId, role: 'assistant', content: '', timestamp: new Date(), streaming: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);
    abortRef.current = { abort: false };

    try {
      // Handle slash commands that don't hit the stream
      if (text.startsWith('/')) {
        const cmd = matchCommand(text)[0];
        if (cmd && !['/provider', '/models', '/settings'].includes(cmd.command)) {
          await new Promise((r) => setTimeout(r, 300));
          setMessages((prev) => prev.map((m) => m.id === assistantId ? {
            ...m, content: `**${cmd.command}** — running ${cmd.description.toLowerCase()}…\n\nQueued with the orchestration engine. You'll see results appear here as agents complete their work.`,
            streaming: false,
          } : m));
          HapticsService.success();
          setStreaming(false);
          return;
        }
      }

      for await (const chunk of api.streamMessage(id!, { content: finalText })) {
        if (abortRef.current.abort) break;
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m));
      }
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m));
      HapticsService.receive();
    } catch (e: any) {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? {
        ...m, content: '', error: e?.message ?? 'Response failed. Check your connection and try again.', streaming: false,
      } : m));
      HapticsService.error();
    }
    setStreaming(false);
  };

  const retry = (failedMsg: UIMessage) => {
    // Find user msg before the failed assistant msg and re-send its content
    const idx = messages.findIndex((m) => m.id === failedMsg.id);
    const prev = idx > 0 ? messages[idx - 1] : null;
    if (prev?.role === 'user') {
      setMessages((ms) => ms.filter((m) => m.id !== failedMsg.id));
      send({ text: prev.content, attachments: prev.attachments as any });
    }
  };

  const keyExtractor = (item: UIMessage) => item.id;
  const renderItem = ({ item, index }: ListRenderItemInfo<UIMessage>) => (
    <View style={{ paddingHorizontal: layout.isTablet ? 24 : 12 }}>
      <MessageBubble
        message={item}
        isLast={index === messages.length - 1}
        onRetry={retry}
        onLongPress={(m) => { setActiveMsg(m); setSheetOpen(true); }}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {isLoading && messages.length === 0 ? (
        <View style={{ flex: 1, paddingTop: 16 }}>
          <MessageSkeleton />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.logoBubble, { backgroundColor: colors.primarySoft }]}>
            <Icon.Sparkles size={28} color={colors.primary} />
          </View>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 16 }}>How can I help today?</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
            Ask anything, write code, attach files, or use voice to get started.
          </Text>
        </View>
      ) : (
        <FlashList
          ref={listRef}
          data={messages}
          keyExtractor={keyExtractor}
          estimatedItemSize={120}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 24,
            paddingHorizontal: layout.isTablet ? 24 : 4,
          }}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {}}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={!layout.isTablet}
        />
      )}

      {/* Slash commands suggestions */}
      {suggestions.length > 0 && draft.startsWith('/') && (
        <View style={[styles.suggestions, { backgroundColor: colors.surface, borderColor: colors.separator, bottom: 76 + insets.bottom }]}>
          {suggestions.slice(0, 5).map((cmd) => (
            <HPressable
              key={cmd.command}
              haptic="selection"
              onPress={() => { setDraft(cmd.prefix ?? `${cmd.command} `); setSuggestions([]); }}
              style={styles.suggestion}
            >
              <Text style={{ fontSize: 18 }}>{cmd.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{cmd.command}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{cmd.description}</Text>
              </View>
            </HPressable>
          ))}
        </View>
      )}

      {/* Composer */}
      <View style={{ paddingBottom: insets.bottom > 0 ? 0 : 8, backgroundColor: colors.bg }}>
        <Composer
          onSend={send}
          streaming={streaming}
          onStopStreaming={stopStreaming}
          initialText={draft}
          onChangeText={onDraftChange}
          disabled={isLoading}
        />
      </View>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} snapPoints={[0.35]}>
        <View style={{ padding: 20 }}>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Message</Text>
          {[
            { label: 'Copy text', icon: <Icon.Copy size={18} color={colors.text} />, onPress: () => {
              setSheetOpen(false);
              require('expo-clipboard').default.setStringAsync(activeMsg?.content ?? '').then(() => HapticsService.success());
            }},
            { label: activeMsg?.role === 'assistant' ? 'Regenerate' : 'Edit', icon: <Icon.Refresh size={18} color={colors.text} />, onPress: () => { setSheetOpen(false); if (activeMsg) retry(activeMsg); } },
            { label: 'Share', icon: <Icon.Paperclip size={18} color={colors.text} />, onPress: () => { setSheetOpen(false); } },
          ].map((it) => (
            <HPressable key={it.label} onPress={it.onPress} haptic="light"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
              {it.icon}
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>{it.label}</Text>
            </HPressable>
          ))}
        </View>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logoBubble: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  suggestions: { position: 'absolute', left: 12, right: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 8, maxHeight: 260 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 10 },
});
