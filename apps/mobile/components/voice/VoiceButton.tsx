/**
 * VoiceButton — circular mic/stop button used in the composer and elsewhere.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HPressable } from '@/components/common/Pressable';
import { Icon } from '@/components/common/Icon';
import { useTheme } from '@/theme/theme';

interface Props {
  active: boolean;
  onPress: () => void;
  size?: number;
}

export function VoiceButton({ active, onPress, size = 44 }: Props) {
  const { colors } = useTheme();
  return (
    <HPressable haptic="medium" onPress={onPress} style={[
      styles.btn,
      {
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: active ? colors.danger : colors.inputBg,
      },
    ]}>
      {active ? <Icon.Stop size={16} color="#fff" /> : <Icon.Mic size={18} color={colors.textSecondary} />}
    </HPressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
});
