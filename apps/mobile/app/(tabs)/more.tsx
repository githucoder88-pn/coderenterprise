/**
 * More Screen — settings, providers, models, billing, extensions, notifications.
 */
import React from 'react';
import { View, Text, FlatList, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { HPressable } from '@/components/common/Pressable';
import { Icon, type IconName } from '@/components/common/Icon';
import { Card } from '@/components/common/Card';
import { ScreenContainer } from '@/components/common/SafeLayout';
import { useAppStore } from '@/stores/app-store';
import { useAuthStore } from '@/stores/auth-store';

interface Row {
  label: string;
  description?: string;
  icon: IconName;
  iconColor?: string;
  route?: string;
  toggle?: boolean;
  action?: () => void;
}

export default function MoreScreen() {
  const router = useRouter();
  const { colors, typography } = useTheme();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const user = useAuthStore((s) => s.user);

  const sections: Array<{ title: string; data: Row[] }> = [
    {
      title: 'Account',
      data: [
        { label: 'Profile', description: user?.displayName ?? user?.email ?? 'Sign in', icon: 'Users', route: '/account' },
        { label: 'Billing & Usage', icon: 'Bolt', route: '/(tabs)/more' },
      ],
    },
    {
      title: 'Configuration',
      data: [
        { label: 'Providers', description: 'AI provider connections', icon: 'Globe' },
        { label: 'Models', description: 'Model registry', icon: 'Cpu' },
        { label: 'Extensions', description: 'Installed extensions', icon: 'Sparkles' },
        { label: 'Notifications', description: 'Alert preferences', icon: 'Chat' },
      ],
    },
    {
      title: 'Appearance',
      data: [
        { label: 'Dark Mode', icon: theme === 'dark' ? 'Moon' : 'Sun', toggle: theme === 'dark', action: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
        { label: 'Settings', description: 'App preferences', icon: 'Settings', route: '/settings' },
      ],
    },
  ];

  return (
    <ScreenContainer bg={colors.bgGrouped} padded={false}>
      <FlatList
        data={sections}
        keyExtractor={(s) => s.title}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item: section }) => (
          <View style={{ marginBottom: 24 }}>
            <Text style={[typography.caption1, { color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 4 }]}>
              {section.title}
            </Text>
            <Card padded={false}>
              {section.data.map((row, i) => {
                const I = Icon[row.icon];
                return (
                  <HPressable
                    key={row.label}
                    haptic="selection"
                    onPress={() => {
                      if (row.action) row.action();
                      else if (row.route) router.push(row.route as any);
                    }}
                  >
                    <View style={[
                      styles.row,
                      i < section.data.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator } : null,
                    ]}>
                      <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
                        <I size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{row.label}</Text>
                        {row.description ? <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{row.description}</Text> : null}
                      </View>
                      {row.toggle !== undefined ? (
                        <Switch value={row.toggle} onValueChange={() => row.action?.()} trackColor={{ false: colors.separator, true: colors.primary }} />
                      ) : (
                        <Icon.ChevronRight size={16} color={colors.textTertiary} />
                      )}
                    </View>
                  </HPressable>
                );
              })}
            </Card>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
