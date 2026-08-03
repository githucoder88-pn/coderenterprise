/**
 * MessageToolbar — inline action bar appearing on long-press.
 * The current experience surfaces these actions via bottom sheet; this component
 * is provided as a reusable inline variant for tablets / larger breakpoints.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/theme';
import { HPressable } from '@/components/common/Pressable';
import { Icon } from '@/components/common/Icon';

interface Props {
  onCopy: () => void;
  onRegenerate?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

export function MessageToolbar({ onCopy, onRegenerate, onShare, onDelete }: Props) {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: colors.surfaceElevated, borderRadius: radius.pill, borderColor: colors.separator }]}>
      <HPressable haptic="selection" onPress={onCopy} style={styles.btn}>
        <Icon.Copy size={14} color={colors.text} />
        <Text style={[styles.label, { color: colors.text }]}>Copy</Text>
      </HPressable>
      {onRegenerate && (
        <HPressable haptic="selection" onPress={onRegenerate} style={styles.btn}>
          <Icon.Refresh size={14} color={colors.text} />
          <Text style={[styles.label, { color: colors.text }]}>Retry</Text>
        </HPressable>
      )}
      {onShare && (
        <HPressable haptic="selection" onPress={onShare} style={styles.btn}>
          <Icon.Paperclip size={14} color={colors.text} />
          <Text style={[styles.label, { color: colors.text }]}>Share</Text>
        </HPressable>
      )}
      {onDelete && (
        <HPressable haptic="warning" onPress={onDelete} style={styles.btn}>
          <Icon.X size={14} color={colors.danger} />
        </HPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 4, borderWidth: StyleSheet.hairlineWidth },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  label: { fontSize: 12, fontWeight: '600' },
});
