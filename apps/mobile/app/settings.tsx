/**
 * Settings Screen
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAppStore } from '@/stores/app-store';

export default function SettingsScreen() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const isDark = theme === 'dark';
  const c = isDark ? { bg: '#0a0a0a', card: '#171717', border: '#262626', text: '#fafafa', sub: '#a3a3a3', accent: '#3b82f6' }
    : { bg: '#ffffff', card: '#fafafa', border: '#e5e5e5', text: '#0a0a0a', sub: '#737373', accent: '#2563eb' };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: 16 }}>
      <Text style={[s.section, { color: c.text }]}>Appearance</Text>
      <View style={s.row}>
        {(['light', 'dark'] as const).map((t) => (
          <Pressable
            key={t}
            style={[s.option, { borderColor: theme === t ? c.accent : c.border, backgroundColor: theme === t ? c.accent + '20' : c.card }]}
            onPress={() => setTheme(t)}
          >
            <Text style={{ color: theme === t ? c.accent : c.text, fontWeight: '600', textTransform: 'capitalize' }}>{t}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
});
