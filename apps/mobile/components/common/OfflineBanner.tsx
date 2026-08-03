/**
 * OfflineBanner — thin pill indicating connection state.
 * Absolute positioned below the navigation bar; animates height in/out.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/theme';
import { SyncManager } from '@/offline/sync';
import { Icon } from './Icon';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(true);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    return SyncManager.subscribe((o) => {
      setOnline(o);
      if (o) {
        opacity.value = withTiming(0, { duration: 180 });
        height.value = withSpring(0);
      } else {
        height.value = withSpring(32);
        opacity.value = withTiming(1, { duration: 220 });
      }
    });
  }, []);

  const style = useAnimatedStyle(() => ({ height: height.value, opacity: opacity.value }));

  return (
    <Animated.View style={[{ position: 'absolute', top: insets.top + 44, left: 0, right: 0, overflow: 'hidden', zIndex: 999 }, style]}>
      <View style={[styles.banner, { backgroundColor: colors.warning + '22' }]}>
        <Icon.Offline size={14} color={colors.warning} />
        <Text style={{ color: colors.warning, fontSize: 12, fontWeight: '700', marginLeft: 6 }}>
          Offline — queued
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 12 },
});
