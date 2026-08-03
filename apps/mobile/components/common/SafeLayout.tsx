/**
 * SafeLayout / SafeScreen / ScreenContainer — safe-area aware wrappers with
 * adaptive spacing for notch, Dynamic Island, tablet, foldable, and keyboard.
 */
import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { View, StyleSheet, ScrollView, ViewStyle, StyleProp, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayout } from '@/utils/responsive';
import { darkColors, lightColors } from '@/theme/tokens';
import { useAppStore } from '@/stores/app-store';

interface InsetContextValue {
  topInset: number;
  bottomInset: number;
  leftInset: number;
  rightInset: number;
  contentWidth: number;
  gutter: number;
}
const InsetContext = createContext<InsetContextValue | null>(null);

export function InsetProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const value = useMemo<InsetContextValue>(() => ({
    topInset: insets.top + 4,
    bottomInset: insets.bottom + 8,
    leftInset: Math.max(insets.left, layout.isLandscape ? 12 : 0),
    rightInset: Math.max(insets.right, layout.isLandscape ? 12 : 0),
    contentWidth: layout.contentWidth,
    gutter: layout.gutter,
  }), [insets, layout]);
  return <InsetContext.Provider value={value}>{children}</InsetContext.Provider>;
}

export function useInsets(): InsetContextValue {
  const ctx = useContext(InsetContext);
  if (!ctx) return { topInset: 44, bottomInset: 34, leftInset: 0, rightInset: 0, contentWidth: 400, gutter: 16 };
  return ctx;
}

export function SafeLayout({ children }: { children: ReactNode }) {
  const theme = useAppStore((s) => s.theme);
  const isDark = theme === 'dark';
  const bg = isDark ? darkColors.bg : lightColors.bg;
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={bg} />
      <InsetProvider>{children}</InsetProvider>
    </SafeAreaProvider>
  );
}

interface SafeScreenProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  bg?: string;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

/**
 * Full-screen container that respects safe-area insets.
 */
export function SafeScreen({ children, style, bg, edges = ['top', 'bottom', 'left', 'right'] }: SafeScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.screen, bg ? { backgroundColor: bg } : null, style]}
    >
      <View style={[styles.screen, { paddingTop: edges.includes('top') ? 0 : insets.top }]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  bg?: string;
  padded?: boolean;
  keyboardAware?: boolean;
}

/**
 * Responsive content container that adapts gutters, max-width, and
 * horizontal padding for compact / tablet / foldable layouts.
 */
export function ScreenContainer({
  children, scroll = false, style, bg, padded = true,
  keyboardAware = false,
}: ScreenContainerProps) {
  const { leftInset, rightInset, gutter } = useInsets();
  const layout = useLayout();
  const horizontalPad = Math.max(leftInset, rightInset) + (padded ? gutter : 0);

  const contentStyle: ViewStyle = {
    paddingHorizontal: horizontalPad,
    paddingTop: padded ? 8 : 0,
    flex: 1,
    backgroundColor: bg,
  };

  const inner = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: horizontalPad,
        paddingTop: padded ? 8 : 0,
        paddingBottom: layout.insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={!layout.isTablet}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[contentStyle, style]}>{children}</View>
  );

  if (keyboardAware) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {inner}
      </KeyboardAvoidingView>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
