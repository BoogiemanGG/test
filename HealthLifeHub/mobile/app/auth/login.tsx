import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useUserStore } from '../../store/userStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login, loginWithGoogle, isLoading } = useUserStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  React.useEffect(() => {
    if (googleResponse?.type === 'success') {
      const accessToken = googleResponse.authentication?.accessToken;
      if (accessToken) {
        loginWithGoogle(accessToken)
          .then(() => router.replace('/(tabs)'))
          .catch(() => setError('Google sign-in failed. Please try again.'));
      }
    }
  }, [googleResponse]);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch {
      setError('Wrong email or password. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={styles.logoArea}>
            <Text style={styles.logoEmoji}>🥗</Text>
            <Text style={styles.appName}>HealthLifeHub</Text>
            <Text style={styles.tagline}>Your AI nutrition coach</Text>
          </View>

          {/* Form */}
          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Your password"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>{isLoading ? 'Signing in...' : 'Sign In'}</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => promptGoogleAsync()}
              disabled={isLoading}
            >
              <Text style={styles.googleButtonText}>🇬 Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/auth/register')} style={styles.linkRow}>
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.link}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SPACING.base },
  logoArea: { alignItems: 'center', marginBottom: SPACING.xxl },
  logoEmoji: { fontSize: 64, marginBottom: SPACING.sm },
  appName: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  tagline: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.xl, gap: SPACING.sm,
  },
  title: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginBottom: SPACING.sm },
  label: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.xs },
  input: {
    backgroundColor: COLORS.surfaceLight, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.base,
  },
  error: { color: COLORS.error, fontSize: FONTS.sizes.sm, textAlign: 'center' },
  button: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginHorizontal: SPACING.sm },
  googleButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  googleButtonText: { color: '#1a1a1a', fontSize: FONTS.sizes.base, fontWeight: '600' },
  linkRow: { alignItems: 'center', marginTop: SPACING.sm },
  linkText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  link: { color: COLORS.primary, fontWeight: '600' },
});
