import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useUserStore } from '../../store/userStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

export default function RegisterScreen() {
  const { register, isLoading } = useUserStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      await register(email.trim().toLowerCase(), password, name.trim());
      router.replace('/(tabs)');
    } catch {
      setError('Could not create account. Try a different email.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.logoArea}>
            <Text style={styles.logoEmoji}>🥗</Text>
            <Text style={styles.appName}>HealthLifeHub</Text>
            <Text style={styles.tagline}>Start your health journey</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Free forever — no credit card needed</Text>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              autoCorrect={false}
            />

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
              placeholder="Min. 6 characters"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Repeat your password"
              placeholderTextColor={COLORS.textMuted}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>{isLoading ? 'Creating account...' : 'Create Account'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.linkRow}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.link}>Sign in</Text>
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
  logoArea: { alignItems: 'center', marginBottom: SPACING.xl },
  logoEmoji: { fontSize: 56, marginBottom: SPACING.sm },
  appName: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary },
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
  linkRow: { alignItems: 'center', marginTop: SPACING.sm },
  linkText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  link: { color: COLORS.primary, fontWeight: '600' },
});
