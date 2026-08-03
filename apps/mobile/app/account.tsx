/**
 * Account Screen
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfile } from '@/hooks/use-api';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';

export default function AccountScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { logout } = useAuthStore();
  const isDark = useAppStore((s) => s.theme) === 'dark';
  const c = isDark ? { bg: '#0a0a0a', card: '#171717', border: '#262626', text: '#fafafa', sub: '#a3a3a3', accent: '#3b82f6', error: '#ef4444' }
    : { bg: '#ffffff', card: '#fafafa', border: '#e5e5e5', text: '#0a0a0a', sub: '#737373', accent: '#2563eb', error: '#dc2626' };

  const user = profile as any;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: 16 }}>
      <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[s.avatar, { backgroundColor: c.accent }]}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
            {(user?.displayName ?? user?.email ?? 'U')[0]?.toUpperCase()}
          </Text>
        </View>
        <Text style={[s.name, { color: c.text }]}>{user?.displayName ?? 'User'}</Text>
        <Text style={[s.email, { color: c.sub }]}>{user?.email ?? '—'}</Text>
      </View>

      <Pressable
        style={[s.logoutBtn, { borderColor: c.error }]}
        onPress={() => { logout(); router.replace('/auth'); }}
      >
        <Text style={{ color: c.error, fontWeight: '600', fontSize: 15 }}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: 20, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  name: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 14 },
  logoutBtn: { padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
});
