/**
 * WaveformView — animated live-audio waveform visualization.
 *
 * Uses a single shared value for animation time; each bar is its own component
 * so the rules of hooks are honored.
 */
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, interpolate } from 'react-native-reanimated';
import { useTheme } from '@/theme/theme';

interface WaveformProps {
  active: boolean;
  levels?: number[];
  bars?: number;
  color?: string;
  height?: number;
}

export function WaveformView({ active, levels, bars = 28, color, height = 36 }: WaveformProps) {
  const { colors } = useTheme();
  const c = color ?? colors.primary;
  const t = useSharedValue(0);
  const latestLevels = useSharedValue<number[]>(levels ?? []);

  useEffect(() => {
    latestLevels.value = levels ?? [];
  }, [levels]);

  useEffect(() => {
    if (active) {
      t.value = 0;
      t.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false);
    } else {
      t.value = withTiming(0, { duration: 220 });
    }
  }, [active]);

  const barsArr = useMemo(() => Array.from({ length: bars }, (_, i) => i), [bars]);

  return (
    <View style={[styles.row, { height }]}>
      {barsArr.map((i) => (
        <WaveBar key={i} index={i} total={bars} color={c} height={height} active={active} t={t} levels={latestLevels} />
      ))}
    </View>
  );
}

function WaveBar({ index, total, color, height, active, t, levels }: {
  index: number; total: number; color: string; height: number; active: boolean;
  t: Animated.SharedValue<number>;
  levels: Animated.SharedValue<number[]>;
}) {
  const phase = index / total;
  const style = useAnimatedStyle(() => {
    const external = levels.value[index] ?? 0;
    const simulated = interpolate(
      Math.sin((t.value * Math.PI * 2) + phase * Math.PI * 4),
      [-1, 1],
      active ? [0.25, 1] : [0.15, 0.2],
    );
    const val = external > 0.05 ? external : simulated;
    const h = Math.max(3, val * height);
    return { height: h, opacity: active ? 1 : 0.45 };
  });
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, flex: 1 },
  bar: { width: 3, borderRadius: 2 },
});
