import React, { type ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/theme/theme';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  onPress?: () => void;
}

export function Card({ children, style, padded = true }: CardProps) {
  const { colors, radius, shadows } = useTheme();
  return (
    <View style={[
      styles.card,
      {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.separator,
        padding: padded ? 14 : 0,
      },
      shadows.sm,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
});
