/**
 * Lightweight bottom-sheet implementation using reanimated + gesture-handler.
 * Avoids @gorhom/bottom-sheet dependency while providing a native-feeling
 * snap-point sheet with backdrop, drag handle, and dismiss gesture.
 */
import React, { useEffect, type ReactNode } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, clamp, Easing } from 'react-native-reanimated';
import { useTheme } from '@/theme/theme';

const { height: SCREEN_H } = Dimensions.get('window');

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: number[]; // fractions of screen height, e.g. [0.5, 0.9]
  initialSnap?: number; // index
}

export function BottomSheet({ open, onClose, children, snapPoints = [0.5], initialSnap = 0 }: BottomSheetProps) {
  const { colors, radius, spacing } = useTheme();
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);
  const mount = useSharedValue(0);

  useEffect(() => {
    if (open) {
      mount.value = 1;
      backdropOpacity.value = withTiming(1, { duration: 180 });
      const snap = snapPoints[initialSnap] ?? 0.5;
      translateY.value = withSpring(SCREEN_H * (1 - snap), { damping: 28, stiffness: 280, mass: 0.8 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.ease) });
      translateY.value = withTiming(SCREEN_H, { duration: 220, easing: Easing.out(Easing.cubic) }, () => {
        mount.value = 0;
      });
    }
  }, [open]);

  const pan = Gesture.Pan()
    .onStart(() => {})
    .onChange((e) => {
      const base = SCREEN_H * (1 - (snapPoints[initialSnap] ?? 0.5));
      const next = Math.max(0, base + e.translationY);
      translateY.value = next;
    })
    .onEnd((e) => {
      const dismissThreshold = 120;
      if (e.translationY > dismissThreshold || e.velocityY > 600) {
        translateY.value = withTiming(SCREEN_H, { duration: 220 });
        backdropOpacity.value = withTiming(0, { duration: 160 });
        runOnJS(onClose)();
      } else {
        const snap = snapPoints[initialSnap] ?? 0.5;
        translateY.value = withSpring(SCREEN_H * (1 - snap), { damping: 28, stiffness: 280 });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const containerStyle = useAnimatedStyle(() => ({ pointerEvents: mount.value ? ('auto' as const) : ('none' as const) }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, containerStyle]} pointerEvents={open ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingBottom: spacing['4'],
            height: SCREEN_H,
          },
          sheetStyle,
        ]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.sheetHandle }]} />
          </View>
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleRow: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 40, height: 5, borderRadius: 3 },
});
