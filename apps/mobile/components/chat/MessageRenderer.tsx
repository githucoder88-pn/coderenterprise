/**
 * MessageRenderer — renders a chat message bubble with role styling,
 * markdown/code-block support, reactions, and a message toolbar.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/theme';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Icon } from '@/components/common/Icon';
import { HPressable } from '@/components/common/Pressable';
import * as Clipboard from 'expo-clipboard';
import { HapticsService } from '@/utils/haptics';
import { format } from 'date-fns';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date | number;
  streaming?: boolean;
  attachments?: Array<{ uri: string; type: string; name?: string }>;
  error?: string;
}

interface MessageProps {
  message: UIMessage;
  onCopy?: (text: string) => void;
  onRetry?: (msg: UIMessage) => void;
  onLongPress?: (msg: UIMessage, anchor: { x: number; y: number }) => void;
  isLast?: boolean;
}

function roleBubble(role: string, colors: any, isUser: boolean) {
  if (isUser) return { bg: colors.userBubble, fg: colors.userBubbleText, align: 'flex-end' as const, flat: 'bottom-right' as const };
  if (role === 'system') return { bg: colors.surfaceSecondary, fg: colors.textSecondary, align: 'center' as const, flat: 'none' as const };
  return { bg: colors.agentBubble, fg: colors.agentBubbleText, align: 'flex-start' as const, flat: 'bottom-left' as const };
}

const AnimatedView = Reanimated.createAnimatedComponent(View);

function TypingDots() {
  const { colors } = useTheme();
  const d1 = useSharedValue(0);
  const d2 = useSharedValue(0);
  const d3 = useSharedValue(0);
  React.useEffect(() => {
    const animate = (d: any, _delay: number) => {
      d.value = withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }, () => {
        d.value = withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) }, () => animate(d, _delay));
      });
    };
    setTimeout(() => animate(d1, 0), 0);
    setTimeout(() => animate(d2, 150), 150);
    setTimeout(() => animate(d3, 300), 300);
    return () => {};
  }, []);
  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: -d1.value * 4 }], opacity: 0.4 + d1.value * 0.6 }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: -d2.value * 4 }], opacity: 0.4 + d2.value * 0.6 }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: -d3.value * 4 }], opacity: 0.4 + d3.value * 0.6 }));
  return (
    <View style={typingStyles.row}>
      <AnimatedView style={[typingStyles.dot, { backgroundColor: colors.textTertiary }, s1]} />
      <AnimatedView style={[typingStyles.dot, { backgroundColor: colors.textTertiary }, s2]} />
      <AnimatedView style={[typingStyles.dot, { backgroundColor: colors.textTertiary }, s3]} />
    </View>
  );
}

const typingStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, paddingVertical: 8, paddingHorizontal: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

export function MessageBubble({ message, onCopy, onRetry, onLongPress, isLast }: MessageProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const isUser = message.role === 'user';
  const b = roleBubble(message.role, colors, isUser);
  const [pressed, setPressed] = useState(false);
  const pressedScale = useSharedValue(1);
  const translateX = useSharedValue(0);

  const copy = async () => {
    await Clipboard.setStringAsync(message.content);
    HapticsService.success();
    onCopy?.(message.content);
  };

  const longPress = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      HapticsService.longPress();
      if (onLongPress) {
        // defer to JS thread for layout
        setTimeout(() => onLongPress(message, { x: 0, y: 0 }), 0);
      }
    });

  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onChange((e: { translationX: number }) => {
      const x = Math.max(-60, Math.min(60, e.translationX * 0.3));
      translateX.value = x;
    })
    .onEnd(() => {
      translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const composed = Gesture.Simultaneous(longPress, Gesture.Simultaneous(pan, Gesture.Native()));

  const bubbleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }, { scale: pressedScale.value }] }));

  if (message.role === 'system') {
    return (
      <View style={{ alignItems: 'center', paddingVertical: spacing['2'] }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 4, backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill }}>
          <Text style={[typography.caption1, { color: colors.textTertiary }]}>{message.content}</Text>
        </View>
      </View>
    );
  }

  const showContent = !message.error && (message.content.length > 0 || !message.streaming);

  return (
    <GestureDetector gesture={composed}>
      <AnimatedView style={[{ alignSelf: b.align, maxWidth: isUser ? '82%' : '88%', marginVertical: 3 }, bubbleStyle]}>
        <View style={[
          styles.bubble,
          {
            backgroundColor: b.bg,
            borderBottomLeftRadius: b.flat === 'bottom-left' ? 6 : radius.xl,
            borderBottomRightRadius: b.flat === 'bottom-right' ? 6 : radius.xl,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingHorizontal: isUser ? 14 : 12,
            paddingVertical: isUser ? 10 : 8,
          },
        ]}>
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <View style={{ marginBottom: 6, gap: 6 }}>
              {message.attachments.map((a, i) => (
                a.type.startsWith('image/') ? (
                  <View key={i} style={{ borderRadius: radius.md, overflow: 'hidden' }}>
                    {/* using plain View+URI image fallback via Image component */}
                    {(() => {
                      const Image = require('react-native').Image;
                      return <Image source={{ uri: a.uri }} style={{ width: 220, height: 150, borderRadius: radius.md }} resizeMode="cover" />;
                    })()}
                  </View>
                ) : (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.sm }}>
                    <Icon.File size={16} color={b.fg} />
                    <Text style={{ color: b.fg, fontSize: 13, flexShrink: 1 }} numberOfLines={1}>{a.name ?? 'Attachment'}</Text>
                  </View>
                )
              ))}
            </View>
          )}

          {message.error ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon.Warn size={16} color={colors.danger} />
                <Text style={{ color: colors.danger, fontWeight: '600' }}>Response failed</Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{message.error}</Text>
              {onRetry && (
                <HPressable haptic="medium" onPress={() => onRetry(message)} style={{ alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.danger }}>
                  <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 12 }}>Retry</Text>
                </HPressable>
              )}
            </View>
          ) : !showContent ? (
            <TypingDots />
          ) : isUser ? (
            <Text selectable style={[typography.callout, { color: b.fg, lineHeight: 22 }]}>{message.content}</Text>
          ) : (
            <View style={{ paddingVertical: 2 }}>
              <MarkdownRenderer content={message.content} />
            </View>
          )}
        </View>

        {/* Message meta: timestamp + status */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingHorizontal: 6, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
          <Text style={[typography.caption2, { color: colors.textTertiary }]}>
            {format(new Date(message.timestamp), 'h:mm a')}
          </Text>
          {isUser && !message.streaming && !message.error && (
            <Icon.Check size={12} color={colors.textTertiary} />
          )}
        </View>
      </AnimatedView>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  bubble: { overflow: 'hidden' },
});
