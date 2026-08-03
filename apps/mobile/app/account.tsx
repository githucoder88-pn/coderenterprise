/**
 * Account Screen
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useProfile } from '@/hooks/use-api';
import { useAuthStore } from '@/stores/auth-store';
import { HPressable } from '@/components/common/Pressable';
import { Icon } from '@/components/common/Icon';
import { Card } from '@/components/common/Card';
import { ScreenContainer } from '@/components/common/SafeLayout';
import { secureStorage } from '@/security/secure-storage';
import { HapticsService } from '@/utils/haptics';

export default function AccountScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { logout } = useAuthStore();
  const { colors, typography, spacing } = useTheme();

  const user = profile as any;
  const initial = (user?.displayName ?? user?.email ?? 'U')[0]?.toUpperCase();

  const doLogout = async () => {
    HapticsService.warning();
    try { await secureStorage.clearAll(); } catch {}
    logout();
    router.replace('/auth');
  };

  return (
    <ScreenContainer scroll bg={colors.bgGrouped}>
      <View style={{ padding: 16 }}>
        <Card style={{ alignItems: 'center', paddingVertical: 24, marginBottom: 24 }}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>{initial}</Text>
          </View>
          <Text style={[typography.title2, { color: colors.text, marginTop: 12 }]}>
            {user?.displayName ?? 'User'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}>
            {user?.email ?? '—'}
          </Text>
          <Text style={[typography.caption1, { color: colors.textTertiary, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }]}>
            {user?.role ?? 'member'} · {user?.organizationId ?? 'coder'}
          </Text>
        </Card>

        <Card padded={false}>
          {[
            { label: 'Security', icon: <Icon.Settings size={18} color={colors.primary} />, desc: 'Biometrics & sessions' },
            { label: 'API Keys', icon: <Icon.Key size={18} color={colors.primary} />, desc: 'Manage tokens' },
            { label: 'Notifications', icon: <Icon.Chat size={18} color={colors.primary} />, desc: 'Alert preferences' },
          ].map((r, i, arr) => (
            <HPressable key={r.label} haptic="light">
              <View style={[styles.row, i < arr.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator } : null]}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>{r.icon}</View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{r.label}</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{r.desc}</Text>
                </View>
                <Icon.ChevronRight size={16} color={colors.textTertiary} />
              </View>
            </HPressable>
          ))}
        </Card>

        <HPressable onPress={doLogout} style={[styles.logoutBtn, { borderColor: colors.danger + '60', backgroundColor: colors.danger + '12', marginTop: 24 }]}>
          <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 15 }}>Sign Out</Text>
        </HPressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
});
