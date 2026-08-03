/**
 * Design Tokens — CODER Mobile
 *
 * All spacing, radii, typography, and colors are defined here.
 * Screens must never reference hard-coded colors or spacing.
 */

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const spacing = {
  '0': 0,
  px: 1,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
} as const;

export const typography = {
  // Display
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const, letterSpacing: 0.2 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: 0.18 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.1 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const, letterSpacing: -0.2 },
  // Body
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const, letterSpacing: -0.1 },
  callout: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  subhead: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  caption2: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const },
  // Mono
  mono: { fontSize: 14, lineHeight: 22, fontFamily: 'Courier' as const },
  monoSm: { fontSize: 12, lineHeight: 18, fontFamily: 'Courier' as const },
};

export type ColorScheme = {
  // Base surfaces
  bg: string;
  bgElevated: string;
  bgGrouped: string;
  surface: string;
  surfaceElevated: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  // Brand
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  // Semantic
  success: string;
  warning: string;
  danger: string;
  info: string;
  // Separators
  separator: string;
  separatorOpaque: string;
  // Chrome
  tabBar: string;
  navBar: string;
  inputBg: string;
  inputBorder: string;
  // Code
  codeBg: string;
  codeText: string;
  codeKeyword: string;
  codeString: string;
  codeNumber: string;
  codeComment: string;
  codeFunction: string;
  codeType: string;
  codePunct: string;
  codeInlineBg: string;
  // Bubbles
  userBubble: string;
  userBubbleText: string;
  agentBubble: string;
  agentBubbleText: string;
  // Overlays
  overlay: string;
  sheetHandle: string;
  // Skeleton
  skeletonBase: string;
  skeletonHighlight: string;
};

export const lightColors: ColorScheme = {
  bg: '#ffffff',
  bgElevated: '#ffffff',
  bgGrouped: '#f2f2f7',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  surfaceSecondary: '#f9f9fb',
  surfaceTertiary: '#f2f2f7',
  text: '#0a0a0a',
  textSecondary: '#3c3c43',
  textTertiary: '#8e8e93',
  textInverse: '#ffffff',
  primary: '#2563eb',
  primaryPressed: '#1d4ed8',
  primarySoft: 'rgba(37,99,235,0.10)',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#2563eb',
  separator: 'rgba(60,60,67,0.12)',
  separatorOpaque: '#e5e5ea',
  tabBar: 'rgba(255,255,255,0.92)',
  navBar: 'rgba(255,255,255,0.85)',
  inputBg: '#f2f2f7',
  inputBorder: '#e5e5ea',
  codeBg: '#0b1020',
  codeText: '#e6edf3',
  codeKeyword: '#ff7b72',
  codeString: '#a5d6ff',
  codeNumber: '#79c0ff',
  codeComment: '#8b949e',
  codeFunction: '#d2a8ff',
  codeType: '#ffa657',
  codePunct: '#c9d1d9',
  codeInlineBg: 'rgba(0,0,0,0.06)',
  userBubble: '#2563eb',
  userBubbleText: '#ffffff',
  agentBubble: '#f2f2f7',
  agentBubbleText: '#0a0a0a',
  overlay: 'rgba(0,0,0,0.35)',
  sheetHandle: '#d1d1d6',
  skeletonBase: '#ececec',
  skeletonHighlight: '#f8f8f8',
};

export const darkColors: ColorScheme = {
  bg: '#05050a',
  bgElevated: '#0f0f17',
  bgGrouped: '#05050a',
  surface: '#11111b',
  surfaceElevated: '#16161f',
  surfaceSecondary: '#1b1b26',
  surfaceTertiary: '#242432',
  text: '#f5f5f7',
  textSecondary: '#a1a1aa',
  textTertiary: '#71717a',
  textInverse: '#0a0a0a',
  primary: '#60a5fa',
  primaryPressed: '#3b82f6',
  primarySoft: 'rgba(96,165,250,0.14)',
  success: '#4ade80',
  warning: '#fbbf24',
  danger: '#f87171',
  info: '#60a5fa',
  separator: 'rgba(255,255,255,0.10)',
  separatorOpaque: '#27272a',
  tabBar: 'rgba(10,10,14,0.92)',
  navBar: 'rgba(10,10,14,0.85)',
  inputBg: '#1b1b26',
  inputBorder: '#27272a',
  codeBg: '#070a16',
  codeText: '#e6edf3',
  codeKeyword: '#ff7b72',
  codeString: '#a5d6ff',
  codeNumber: '#79c0ff',
  codeComment: '#8b949e',
  codeFunction: '#d2a8ff',
  codeType: '#ffa657',
  codePunct: '#c9d1d9',
  codeInlineBg: 'rgba(255,255,255,0.08)',
  userBubble: '#3b82f6',
  userBubbleText: '#ffffff',
  agentBubble: '#1b1b26',
  agentBubbleText: '#f5f5f7',
  overlay: 'rgba(0,0,0,0.55)',
  sheetHandle: '#3f3f46',
  skeletonBase: '#1b1b26',
  skeletonHighlight: '#2a2a38',
};

export const shadows = {
  sm: {
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
};

export const animation = {
  fast: 180,
  base: 240,
  slow: 360,
  spring: { damping: 22, stiffness: 320 },
} as const;
