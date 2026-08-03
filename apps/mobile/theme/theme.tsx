/**
 * Theme hook + provider. Exposes colors, typography, spacing, and current scheme.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme, Appearance, AccessibilityInfo } from 'react-native';
import { useAppStore } from '@/stores/app-store';
import { darkColors, lightColors, radius, spacing, typography, shadows, animation, type ColorScheme } from './tokens';

export type Breakpoint = 'compact' | 'regular' | 'expanded' | 'tablet' | 'desktop';

export interface Theme {
  colors: ColorScheme;
  scheme: 'dark' | 'light';
  radius: typeof radius;
  spacing: typeof spacing;
  typography: typeof typography;
  shadows: typeof shadows;
  animation: typeof animation;
  breakpoint: Breakpoint;
  isTablet: boolean;
  isLandscape: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  dynamicTypeEnabled: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const stored = useAppStore((s) => s.theme);
  const reduced = useAppStore((s) => s.reducedMotion);
  const scheme = stored === 'system' ? (systemScheme ?? 'dark') : stored;
  const colors = scheme === 'dark' ? darkColors : lightColors;

  // Breakpoint will be provided by SafeLayout via dimensions — default to compact here.
  const breakpoint: Breakpoint = 'compact';

  const theme = useMemo<Theme>(() => ({
    colors,
    scheme,
    radius,
    spacing,
    typography,
    shadows,
    animation,
    breakpoint,
    isTablet: false,
    isLandscape: false,
    reducedMotion: reduced ?? false,
    highContrast: false,
    dynamicTypeEnabled: true,
  }), [colors, scheme, reduced]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback for hooks used before provider
    return {
      colors: darkColors,
      scheme: 'dark',
      radius,
      spacing,
      typography,
      shadows,
      animation,
      breakpoint: 'compact',
      isTablet: false,
      isLandscape: false,
      reducedMotion: false,
      highContrast: false,
      dynamicTypeEnabled: false,
    };
  }
  return ctx;
}

export function useColors(): ColorScheme {
  return useTheme().colors;
}

export { Appearance, AccessibilityInfo };
