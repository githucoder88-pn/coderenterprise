/**
 * Settings Screen
 */
import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '@/theme/theme';
import { useAppStore } from '@/stores/app-store';
import { HPressable } from '@/components/common/Pressable';
import { Icon } from '@/components/common/Icon';
import { Card } from '@/components/common/Card';
import { ScreenContainer } from '@/components/common/SafeLayout';

export default function SettingsScreen() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const { colors, typography } = useTheme();
  const [hapticsOn, setHapticsOn] = React.useState(true);
  const [soundOn, setSoundOn] = React.useState(false);

  return (
    <ScreenContainer scroll bg={colors.bgGrouped}>
      <View style={{ padding: 16 }}>
        <Text style={[typography.caption1, { color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }]}>Appearance</Text>
        <Card padded={false} style={{ marginBottom: 20 }}>
          <View style={styles.themeRow}>
            {(['light', 'dark'] as const).map((t) => (
              <HPressable
                key={t}
                haptic="selection"
                onPress={() => setTheme(t)}
                style={[
                  styles.themeOption,
                  {
                    borderColor: theme === t ? colors.primary : colors.separator,
                    backgroundColor: theme === t ? colors.primarySoft : colors.surface,
                  },
                ]}
              >
                {t === 'dark' ? <Icon.Moon size={18} color={theme === t ? colors.primary : colors.text} />
                  : <Icon.Sun size={18} color={theme === t ? colors.primary : colors.text} />}
                <Text style={{ color: theme === t ? colors.primary : colors.text, fontWeight: '700', textTransform: 'capitalize', marginTop: 6 }}>{t}</Text>
              </HPressable>
            ))}
          </View>
        </Card>

        <Text style={[typography.caption1, { color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }]}>Feedback</Text>
        <Card padded={false} style={{ marginBottom: 20 }}>
          <View style={[styles.toggleRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Haptics</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12 }}>Vibration feedback on interaction</Text>
            </View>
            <Switch value={hapticsOn} onValueChange={setHapticsOn} trackColor={{ false: colors.separator, true: colors.primary }} />
          </View>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Sound</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12 }}>Play sounds on send/receive</Text>
            </View>
            <Switch value={soundOn} onValueChange={setSoundOn} trackColor={{ false: colors.separator, true: colors.primary }} />
          </View>
        </Card>

        <Text style={[typography.caption1, { color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }]}>About</Text>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Version</Text>
            <Text style={{ color: colors.text, fontSize: 14 }}>1.0.0</Text>
          </View>
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  themeRow: { flexDirection: 'row', gap: 10, padding: 10 },
  themeOption: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
});
