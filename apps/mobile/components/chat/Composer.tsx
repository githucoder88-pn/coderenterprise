/**
 * Composer — rich chat input bar with attachments, voice input, and send.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Text, Platform, Keyboard } from 'react-native';
import { useTheme } from '@/theme/theme';
import { Icon } from '@/components/common/Icon';
import { HPressable } from '@/components/common/Pressable';
import { AttachmentPicker, type Attachment } from '@/components/attachments/picker';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';
import { WaveformView } from '@/components/voice/WaveformView';
import { HapticsService } from '@/utils/haptics';
import { BottomSheet } from '@/components/sheet/BottomSheet';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

interface ComposerProps {
  onSend: (opts: { text: string; attachments?: Attachment[]; voice?: { uri?: string; durationMs: number } }) => void;
  disabled?: boolean;
  streaming?: boolean;
  placeholder?: string;
  initialText?: string;
  onChangeText?: (t: string) => void;
  onStopStreaming?: () => void;
}

export function Composer({ onSend, disabled, streaming, placeholder = 'Message CODER', initialText = '', onChangeText, onStopStreaming }: ComposerProps) {
  const { colors, radius, spacing } = useTheme();
  const [text, setText] = useState(initialText);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recording, setRecording] = useState(false);
  const [levels, setLevels] = useState<number[]>(Array(28).fill(0.1));
  const [recMs, setRecMs] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const sendScale = useSharedValue(1);
  const recTickRef = useRef<any>(null);

  useEffect(() => { onChangeText?.(text); }, [text]);
  useEffect(() => { setText(initialText); }, [initialText]);

  const sendAnim = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }));

  const send = () => {
    if (streaming && onStopStreaming) { onStopStreaming(); HapticsService.press(); return; }
    if (disabled) return;
    if (!text.trim() && attachments.length === 0 && !recording) return;
    HapticsService.send();
    sendScale.value = withSpring(0.8, { damping: 4, stiffness: 600 }, () => {
      sendScale.value = withSpring(1);
    });
    onSend({ text: text.trim(), attachments });
    setText('');
    setAttachments([]);
    Keyboard.dismiss();
  };

  const startVoice = async () => {
    HapticsService.medium();
    setRecording(true);
    setLevels(Array(28).fill(0.2));
    setRecMs(0);
    VoiceRecorder.onLevel((l) => {
      setLevels((prev) => {
        const next = [...prev.slice(1), l];
        return next;
      });
    });
    const started = await VoiceRecorder.start();
    if (!started) { setRecording(false); return; }
    const start = Date.now();
    recTickRef.current = setInterval(() => setRecMs(Date.now() - start), 100);
  };

  const stopVoice = async (cancel = false) => {
    if (recTickRef.current) clearInterval(recTickRef.current);
    const result = cancel ? (await VoiceRecorder.cancel(), null) : await VoiceRecorder.stop();
    setRecording(false);
    if (result && !cancel) {
      HapticsService.success();
      onSend({
        text: result.transcript ? `🎤 ${result.transcript} (${(result.durationMs/1000).toFixed(1)}s)` : '',
        voice: result,
      });
    }
  };

  const onAttach = async (kind: 'image' | 'camera' | 'document' | 'clipboard') => {
    setSheetOpen(false);
    const r = kind === 'image' ? await AttachmentPicker.image()
      : kind === 'camera' ? await AttachmentPicker.camera()
      : kind === 'document' ? await AttachmentPicker.document()
      : await AttachmentPicker.clipboard();
    if (r) { setAttachments((a) => [...a, r]); HapticsService.select(); }
  };

  const canSend = text.trim().length > 0 || attachments.length > 0;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg, borderTopColor: colors.separator }]}>
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <View style={styles.attRow}>
          {attachments.map((a, i) => (
            <View key={i} style={[styles.att, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={{ color: colors.text, fontSize: 12, paddingHorizontal: 8 }} numberOfLines={1}>
                {a.type.startsWith('image/') ? '📷 image' : `📎 ${a.name ?? 'file'}`}
              </Text>
              <HPressable onPress={() => setAttachments(attachments.filter((_, j) => j !== i))} haptic={false} style={{ padding: 4 }}>
                <Icon.X size={14} color={colors.textSecondary} />
              </HPressable>
            </View>
          ))}
        </View>
      )}

      {/* Inline recording */}
      {recording && (
        <View style={[styles.rec, { backgroundColor: colors.danger + '1a', borderColor: colors.danger + '40' }]}>
          <HPressable haptic="heavy" onPress={() => stopVoice(true)} style={[styles.recBtn, { backgroundColor: colors.surfaceSecondary }]}>
            <Icon.X size={16} color={colors.danger} />
          </HPressable>
          <WaveformView active levels={levels} color={colors.danger} height={32} />
          <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13, fontVariant: ['tabular-nums'], minWidth: 42, textAlign: 'right' }}>
            {Math.floor(recMs/1000)}s
          </Text>
          <HPressable haptic="success" onPress={() => stopVoice(false)} style={[styles.recBtn, { backgroundColor: colors.danger }]}>
            <Icon.Stop size={14} color="#fff" />
          </HPressable>
        </View>
      )}

      {!recording && (
        <View style={styles.row}>
          <HPressable haptic="light" onPress={() => setSheetOpen(true)} style={[styles.iconBtn]}>
            <Icon.Plus size={22} color={colors.textSecondary} />
          </HPressable>

          <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text }]}
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={10000}
              editable={!disabled}
            />
          </View>

          {!canSend ? (
            <HPressable haptic="medium" onPress={startVoice} style={styles.iconBtn}>
              <Icon.Mic size={22} color={colors.textSecondary} />
            </HPressable>
          ) : (
            <Reanimated.View style={sendAnim}>
              <HPressable
                haptic={false}
                onPress={send}
                style={[styles.sendBtn, { backgroundColor: streaming ? colors.danger : colors.primary }]}
              >
                {streaming ? <Icon.Stop size={14} color="#fff" /> : <Icon.Send size={18} color="#fff" />}
              </HPressable>
            </Reanimated.View>
          )}
        </View>
      )}

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} snapPoints={[0.45]}>
        <View style={{ padding: 20, gap: 8 }}>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Attach
          </Text>
          {[
            { k: 'camera', label: 'Take photo', icon: <Icon.Camera size={20} color={colors.text} />, desc: 'Capture with camera' },
            { k: 'image', label: 'Photo library', icon: <Icon.Image size={20} color={colors.text} />, desc: 'Choose from library' },
            { k: 'document', label: 'File', icon: <Icon.File size={20} color={colors.text} />, desc: 'Browse documents' },
            { k: 'clipboard', label: 'Paste from clipboard', icon: <Icon.Paperclip size={20} color={colors.text} />, desc: 'Paste image' },
          ].map((item) => (
            <HPressable key={item.k} onPress={() => onAttach(item.k as any)} haptic="light"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{item.label}</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{item.desc}</Text>
              </View>
              <Icon.ChevronRight size={16} color={colors.textTertiary} />
            </HPressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  inputWrap: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, paddingHorizontal: 14, minHeight: 40 },
  input: { fontSize: 16, lineHeight: 22, paddingVertical: 9, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  attRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingHorizontal: 4, paddingBottom: 6 },
  att: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, overflow: 'hidden', paddingVertical: 4 },
  rec: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, marginBottom: 6 },
  recBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
