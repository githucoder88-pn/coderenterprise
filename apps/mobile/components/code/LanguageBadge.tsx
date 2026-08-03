import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/theme';

export function LanguageBadge({ language }: { language: string }) {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill }]}>
      <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{language}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
});
