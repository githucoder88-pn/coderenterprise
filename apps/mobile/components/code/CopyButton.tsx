import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { HPressable } from '@/components/common/Pressable';
import { Icon } from '@/components/common/Icon';
import { useTheme } from '@/theme/theme';
import { HapticsService } from '@/utils/haptics';

export function CopyButton({ text }: { text: string }) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(text);
    HapticsService.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <HPressable haptic="selection" onPress={copy} style={styles.btn}>
      {copied ? <Icon.Check size={14} color={colors.success} /> : <Icon.Copy size={14} color={colors.textTertiary} />}
      <Text style={{ fontSize: 12, color: copied ? colors.success : colors.textTertiary, fontWeight: '600' }}>
        {copied ? 'Copied' : 'Copy'}
      </Text>
    </HPressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
});
