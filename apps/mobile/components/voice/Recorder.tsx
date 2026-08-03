/**
 * Recorder — self-contained UI for in-progress voice recording (used in Composer).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VoiceRecorder } from './VoiceRecorder';
import { WaveformView } from './WaveformView';
import { VoiceButton } from './VoiceButton';
import { HPressable } from '@/components/common/Pressable';
import { Icon } from '@/components/common/Icon';
import { useTheme } from '@/theme/theme';

interface Props {
  onFinish: (result: { uri?: string; durationMs: number; levels: number[]; transcript?: string }) => void;
  onCancel: () => void;
}

export function Recorder({ onFinish, onCancel }: Props) {
  const { colors } = useTheme();
  const [active, setActive] = useState(false);
  const [levels, setLevels] = useState<number[]>(Array(28).fill(0.15));
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let tick: any;
    (async () => {
      await VoiceRecorder.start();
      setActive(true);
      VoiceRecorder.onLevel((l) => setLevels((prev) => [...prev.slice(1), l]));
      const start = Date.now();
      tick = setInterval(() => setElapsed(Date.now() - start), 100);
    })();
    return () => clearInterval(tick);
  }, []);

  const stop = async () => {
    clearInterval(0);
    const r = await VoiceRecorder.stop();
    setActive(false);
    if (r) onFinish(r);
  };
  const cancel = async () => {
    await VoiceRecorder.cancel();
    setActive(false);
    onCancel();
  };

  return (
    <View style={[styles.bar, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40' }]}>
      <HPressable onPress={cancel} style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]}>
        <Icon.X size={16} color={colors.danger} />
      </HPressable>
      <WaveformView active={active} levels={levels} color={colors.danger} height={32} />
      <Text style={{ color: colors.danger, fontWeight: '700', fontVariant: ['tabular-nums'], minWidth: 40, textAlign: 'right' }}>
        {(elapsed / 1000).toFixed(1)}s
      </Text>
      <VoiceButton active onPress={stop} size={36} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
