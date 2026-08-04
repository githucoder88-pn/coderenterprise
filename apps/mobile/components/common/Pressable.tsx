/**
 * Polished pressable with scaling feedback and haptics.
 */
import React, { useState, type ReactNode } from 'react';
import {
  Pressable as RNPressable,
  type PressableProps,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { haptic as triggerHaptic, type FeedbackType } from '@/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export type HapticKind = FeedbackType | false;

interface HPressableProps extends Omit<PressableProps, 'children' | 'style'> {
  children: ReactNode;
  scaleOnPress?: number;
  haptic?: HapticKind;
  activeOpacity?: number;
  style?: StyleProp<ViewStyle>;
}

export function HPressable({
  children, scaleOnPress = 0.96, haptic = 'light',
  onPressIn, onPressOut, onPress, style, disabled, ...rest
}: HPressableProps) {
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        setPressed(true);
        if (!disabled && scaleOnPress < 1) scale.value = withSpring(scaleOnPress, { damping: 18, stiffness: 400 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        scale.value = withSpring(1, { damping: 20, stiffness: 400 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (!disabled) {
          if (haptic) void triggerHaptic(haptic);
          onPress?.(e);
        }
      }}
      style={[styles.base, style as any, aStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { cursor: Platform.OS === 'web' ? 'pointer' : undefined },
});
