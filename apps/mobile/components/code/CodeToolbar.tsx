import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LanguageBadge } from './LanguageBadge';
import { CopyButton } from './CopyButton';
import { useTheme } from '@/theme/theme';

export function CodeToolbar({ language, code }: { language: string; code: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.bar, { borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
      <LanguageBadge language={language} />
      <View style={{ flex: 1 }} />
      <CopyButton text={code} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
});
