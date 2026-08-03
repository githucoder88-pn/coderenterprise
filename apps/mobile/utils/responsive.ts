/**
 * Responsive utilities — breakpoint detection, screen size class, orientation.
 */
import { Dimensions, PixelRatio, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

export type Breakpoint = 'compact' | 'regular' | 'expanded' | 'tablet' | 'desktop';

export interface LayoutInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isTablet: boolean;
  isFoldable: boolean;
  isLandscape: boolean;
  isSmallPhone: boolean;
  columns: number;
  contentWidth: number;
  gutter: number;
  scale: number;
  fontScale: number;
  insets: ReturnType<typeof useSafeAreaInsets>;
  deviceType: 'phone' | 'tablet' | 'foldable' | 'desktop';
}

export function getBreakpoint(width: number): Breakpoint {
  if (width >= 1200) return 'desktop';
  if (width >= 900) return 'tablet';
  if (width >= 700) return 'expanded';
  if (width >= 480) return 'regular';
  return 'compact';
}

export function useLayout(): LayoutInfo {
  const insets = useSafeAreaInsets();
  const [dims, setDims] = useState(() => Dimensions.get('window'));
  const [fontScale, setFontScale] = useState(1);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDims(window));
    let mounted = true;
    try {
      const { PixelRatio: PR } = require('react-native');
      if (mounted) setFontScale(PR.getFontScale() ?? 1);
    } catch {}
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const { width, height } = dims;
  const shortest = Math.min(width, height);
  const longest = Math.max(width, height);
  const breakpoint = getBreakpoint(width);
  const isLandscape = width > height;
  const isTablet = shortest >= 768 || (Platform.OS === 'ios' && Platform.isPad);
  const isFoldable = shortest >= 500 && shortest < 768 && longest / shortest < 1.8;
  const isSmallPhone = shortest < 360;
  const scale = PixelRatio.get();

  let columns = 1;
  if (breakpoint === 'regular') columns = 1;
  else if (breakpoint === 'expanded') columns = 2;
  else if (breakpoint === 'tablet') columns = isLandscape ? 3 : 2;
  else if (breakpoint === 'desktop') columns = 4;

  const gutter = isTablet ? 20 : 16;
  const contentWidth = isTablet ? Math.min(width - gutter * 2, 720) : width - gutter * 2;

  const deviceType: LayoutInfo['deviceType'] =
    breakpoint === 'desktop' ? 'desktop'
    : isFoldable ? 'foldable'
    : isTablet ? 'tablet'
    : 'phone';

  return {
    width, height, breakpoint, isTablet, isFoldable, isLandscape,
    isSmallPhone, columns, contentWidth, gutter, scale, fontScale,
    insets, deviceType,
  };
}

export function useBreakpoint(): Breakpoint {
  return useLayout().breakpoint;
}

export function useOrientation(): 'portrait' | 'landscape' {
  return useLayout().isLandscape ? 'landscape' : 'portrait';
}
