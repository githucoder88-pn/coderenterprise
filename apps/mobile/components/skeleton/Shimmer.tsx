/**
 * Shimmer + Skeleton primitives for loading states.
 */
import React, { useEffect, type ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '@/theme/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');

export function Shimmer({ children, width }: { children?: ReactNode; width?: number }) {
  const { colors } = useTheme();
  const x = useSharedValue(-SCREEN_W);
  useEffect(() => {
    x.value = -SCREEN_W;
    x.value = withRepeat(
      withTiming(SCREEN_W, { duration: 1400, easing: Easing.linear }),
      -1, false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={[styles.wrap, { backgroundColor: colors.skeletonBase }, width ? { width } : null]}>
      <Animated.View style={[styles.gradientWrap, style]}>
        <LinearGradient
          colors={[colors.skeletonBase, colors.skeletonHighlight, colors.skeletonBase]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={{ opacity: 0 }}>{children}</View>
    </View>
  );
}

interface BlockProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonBlock({ width = '100%', height = 16, radius = 8, style }: BlockProps) {
  return <Shimmer><View style={[{ width, height, borderRadius: radius }, style as any]} /></Shimmer>;
}

export function MessageSkeleton() {
  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 8 }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <View style={[styles.avatar]} />
        <View style={{ gap: 6, flex: 1 }}>
          <SkeletonBlock width="70%" height={14} />
          <SkeletonBlock width="90%" height={14} />
          <SkeletonBlock width="55%" height={14} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
        <View style={{ gap: 6, width: '60%', alignItems: 'flex-end' }}>
          <SkeletonBlock width="80%" height={14} />
          <SkeletonBlock width="50%" height={14} />
        </View>
        <View style={[styles.avatar, { backgroundColor: 'rgba(96,165,250,0.3)' }]} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <View style={[styles.avatar]} />
        <View style={{ gap: 6, flex: 1 }}>
          <SkeletonBlock width="85%" height={14} />
          <SkeletonBlock width="70%" height={14} />
        </View>
      </View>
    </View>
  );
}

export function CardSkeleton() {
  return (
    <View style={{ gap: 10, padding: 16, borderRadius: 14, overflow: 'hidden' }}>
      <SkeletonBlock width="40%" height={14} />
      <SkeletonBlock width="90%" height={20} />
      <SkeletonBlock width="70%" height={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', position: 'relative' },
  gradientWrap: { position: 'absolute', top: 0, bottom: 0, left: 0, width: SCREEN_W * 2 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.06)' },
});
