/**
 * Minimal icon set — built on top of react-native-svg with a text fallback.
 * Avoids heavy icon dependencies while keeping a polished look.
 */
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Path, Circle, G, Rect, Polyline, Polygon } from 'react-native-svg';
import { useTheme } from '@/theme/theme';

type IconProps = { size?: number; color?: string; strokeWidth?: number; filled?: boolean };

function SvgBase({ size = 20, color, children }: IconProps & { children: React.ReactNode }) {
  const { colors } = useTheme();
  const c = color ?? colors.text;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export const Icon = {
  Send: (p: IconProps) => (
    <SvgBase {...p}><Path d="M22 2 11 13" /><Path d="M22 2 15 22 11 13 2 9 22 2Z" /></SvgBase>
  ),
  Plus: (p: IconProps) => <SvgBase {...p}><Path d="M12 5v14M5 12h14" /></SvgBase>,
  Paperclip: (p: IconProps) => (
    <SvgBase {...p}><Path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.8l-8.58 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></SvgBase>
  ),
  Mic: (p: IconProps) => (
    <SvgBase {...p}>
      <Rect x="9" y="2" width="6" height="12" rx="3" />
      <Path d="M19 10a7 7 0 0 1-14 0" />
      <Path d="M12 19v3" />
    </SvgBase>
  ),
  MicOff: (p: IconProps) => (
    <SvgBase {...p}>
      <Path d="M2 2l20 20" />
      <Path d="M18.89 13.23A7.1 7.1 0 0 0 19 10" />
      <Path d="M5 10a7 7 0 0 0 10.89 5.89" />
      <Path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
      <Path d="M12 19v3" />
    </SvgBase>
  ),
  Stop: (p: IconProps) => <SvgBase {...p}><Rect x="6" y="6" width="12" height="12" rx="2" fill={p.color ?? 'currentColor'} stroke="none" /></SvgBase>,
  Copy: (p: IconProps) => (
    <SvgBase {...p}><Rect x="9" y="9" width="13" height="13" rx="2" /><Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></SvgBase>
  ),
  Check: (p: IconProps) => <SvgBase {...p}><Path d="M20 6 9 17l-5-5" /></SvgBase>,
  ChevronRight: (p: IconProps) => <SvgBase {...p}><Path d="m9 18 6-6-6-6" /></SvgBase>,
  ChevronDown: (p: IconProps) => <SvgBase {...p}><Path d="m6 9 6 6 6-6" /></SvgBase>,
  Home: (p: IconProps) => <SvgBase {...p}><Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5h-2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></SvgBase>,
  Chat: (p: IconProps) => <SvgBase {...p}><Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></SvgBase>,
  Folder: (p: IconProps) => <SvgBase {...p}><Path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" /></SvgBase>,
  Users: (p: IconProps) => <SvgBase {...p}><Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><Circle cx="9" cy="7" r="4" /><Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></SvgBase>,
  Menu: (p: IconProps) => <SvgBase {...p}><Path d="M3 6h18M3 12h18M3 18h18" /></SvgBase>,
  Settings: (p: IconProps) => <SvgBase {...p}><Circle cx="12" cy="12" r="3" /><Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></SvgBase>,
  X: (p: IconProps) => <SvgBase {...p}><Path d="M18 6 6 18M6 6l12 12" /></SvgBase>,
  Refresh: (p: IconProps) => <SvgBase {...p}><Path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><Path d="M21 3v5h-5" /><Path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><Path d="M3 21v-5h5" /></SvgBase>,
  Image: (p: IconProps) => <SvgBase {...p}><Rect x="3" y="3" width="18" height="18" rx="2" /><Circle cx="9" cy="9" r="2" /><Path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></SvgBase>,
  Camera: (p: IconProps) => <SvgBase {...p}><Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><Circle cx="12" cy="13" r="4" /></SvgBase>,
  File: (p: IconProps) => <SvgBase {...p}><Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><Path d="M14 2v6h6" /></SvgBase>,
  Play: (p: IconProps) => <SvgBase {...p}><Polygon points="6 3 20 12 6 21 6 3" fill={p.color ?? 'currentColor'} stroke="none" /></SvgBase>,
  Pause: (p: IconProps) => <SvgBase {...p}><Rect x="6" y="4" width="4" height="16" fill={p.color ?? 'currentColor'} stroke="none" /><Rect x="14" y="4" width="4" height="16" fill={p.color ?? 'currentColor'} stroke="none" /></SvgBase>,
  Sparkles: (p: IconProps) => <SvgBase {...p}><Path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></SvgBase>,
  Bolt: (p: IconProps) => <SvgBase {...p}><Path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" fill={p.color ?? 'currentColor'} stroke="none" /></SvgBase>,
  Globe: (p: IconProps) => <SvgBase {...p}><Circle cx="12" cy="12" r="10" /><Path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></SvgBase>,
  Cpu: (p: IconProps) => <SvgBase {...p}><Rect x="4" y="4" width="16" height="16" rx="2" /><Rect x="9" y="9" width="6" height="6" /><Path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" /></SvgBase>,
  Moon: (p: IconProps) => <SvgBase {...p}><Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></SvgBase>,
  Sun: (p: IconProps) => <SvgBase {...p}><Circle cx="12" cy="12" r="4" /><Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></SvgBase>,
  Warn: (p: IconProps) => <SvgBase {...p}><Path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><Path d="M12 9v4M12 17h.01" /></SvgBase>,
  Offline: (p: IconProps) => <SvgBase {...p}><Path d="M1 1l22 22" /><Path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><Path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><Path d="M10.71 5.05A16 16 0 0 1 22.58 9" /><Path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" /><Path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><Path d="M12 20h.01" /></SvgBase>,
  Key: (p: IconProps) => <SvgBase {...p}><Path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></SvgBase>,
};

export type IconName = keyof typeof Icon;
