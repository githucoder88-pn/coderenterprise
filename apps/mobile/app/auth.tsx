/**
 * Auth Screen — sign in.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSignIn } from '@/hooks/use-api';
import { useTheme } from '@/theme/theme';
import { HPressable } from '@/components/common/Pressable';
import { Icon } from '@/components/common/Icon';
import { ScreenContainer } from '@/components/common/SafeLayout';
import { HapticsService } from '@/utils/haptics';
import { secureStorage } from '@/security/secure-storage';
import { useAuthStore } from '@/stores/auth-store';
import { useAuthStore } from '@/stores/auth-store';

export default function AuthScreen() {
  const router = useRouter();
  const signIn = useSignIn();
  const { colors, typography, radius } = useTheme();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isAuth) router.replace('/(tabs)');
  }, [isAuth]);

  const handleSignIn = async () => {
    setError('');
    HapticsService.medium();
    try {
      const data = await signIn.mutateAsync({ email, password });
      if (data?.tokens?.accessToken) {
        await secureStorage.setToken(data.tokens.accessToken);
      }
      HapticsService.success();
      router.replace('/(tabs)');
    } catch (e: any) {
      HapticsService.error();
      setError(e?.message ?? 'Sign in failed');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer padded>
        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 32 }}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={[styles.logo, { backgroundColor: colors.primarySoft }]}>
              <Icon.Sparkles size={32} color={colors.primary} />
            </View>
            <Text style={[typography.largeTitle, { color: colors.text, marginTop: 16 }]}>CODER</Text>
            <Text style={[typography.callout, { color: colors.textSecondary, marginTop: 4 }]}>Enterprise AI Platform</Text>
          </View>

          {error ? (
            <View style={[styles.errBox, { backgroundColor: colors.danger + '18', borderColor: colors.danger + '40' }]}>
              <Icon.Warn size={16} color={colors.danger} />
              <Text style={{ color: colors.danger, fontSize: 13, flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          <View style={{ gap: 10, marginBottom: 16 }}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder }]}
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder }]}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
            />
          </View>

          <HPressable
            onPress={handleSignIn}
            disabled={signIn.isPending || !email || !password}
            style={[styles.button, { backgroundColor: colors.primary, opacity: signIn.isPending || !email || !password ? 0.6 : 1 }]}
          >
            <Text style={styles.buttonText}>{signIn.isPending ? 'Signing in…' : 'Sign In'}</Text>
          </HPressable>

          <Text style={{ textAlign: 'center', color: colors.textTertiary, fontSize: 12, marginTop: 20 }}>
            Protected by end-to-end encryption · Biometric supported
          </Text>
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  logo: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16 },
  button: { padding: 16, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  errBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginBottom: 12 },
});
