/**
 * Auth Screen — sign in / sign up
 */

import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSignIn } from '@/hooks/use-api';
import { useAppStore } from '@/stores/app-store';

export default function AuthScreen() {
  const router = useRouter();
  const signIn = useSignIn();
  const isDark = useAppStore((s) => s.theme) === 'dark';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const c = isDark ? { bg: '#0a0a0a', card: '#171717', border: '#262626', text: '#fafafa', sub: '#a3a3a3', accent: '#3b82f6', inputBg: '#1f1f1f', error: '#ef4444' }
    : { bg: '#ffffff', card: '#fafafa', border: '#e5e5e5', text: '#0a0a0a', sub: '#737373', accent: '#2563eb', inputBg: '#f5f5f5', error: '#dc2626' };

  const handleSignIn = async () => {
    setError('');
    try {
      await signIn.mutateAsync({ email, password });
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Sign in failed');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: 24 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={[s.title, { color: c.text }]}>CODER</Text>
      <Text style={[s.subtitle, { color: c.sub }]}>Enterprise AI Platform</Text>

      {error ? <Text style={[s.error, { color: c.error }]}>{error}</Text> : null}

      <TextInput
        style={[s.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
        placeholder="Email"
        placeholderTextColor={c.sub}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={[s.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
        placeholder="Password"
        placeholderTextColor={c.sub}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable
        style={[s.button, { backgroundColor: c.accent, opacity: signIn.isPending ? 0.7 : 1 }]}
        onPress={handleSignIn}
        disabled={signIn.isPending}
      >
        <Text style={s.buttonText}>{signIn.isPending ? 'Signing in…' : 'Sign In'}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32 },
  error: { fontSize: 13, textAlign: 'center', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  button: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
