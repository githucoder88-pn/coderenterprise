import React from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, interpolate } from 'react-native-reanimated';
import { Icon, type IconName } from './Icon';
import { useTheme } from '@/theme/theme';

interface Props { focused: boolean; icon: IconName; label: string; }

export function TabIcon({ focused, icon, label }: Props) {
  const { colors } = useTheme();
  const scale = withSpring(focused ? 1 : 0.9, { damping: 18, stiffness: 300 });
  const I = Icon[icon];
  return (
    <View style={{ alignItems: 'center', gap: 2, paddingTop: 6 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <I size={focused ? 22 : 20} color={focused ? colors.primary : colors.textTertiary} />
      </Animated.View>
      <Text style={{
        fontSize: 10, fontWeight: focused ? '700' : '500',
        color: focused ? colors.primary : colors.textTertiary,
      }}>{label}</Text>
    </View>
  );
}
