/**
 * Home Screen — The main dashboard
 * Features: SNAP button, daily calorie ring, diary status, voice Q&A bar
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, FONTS } from '../../constants/theme';
import { CalorieRing } from '../../components/CalorieRing';
import { MacroBar } from '../../components/MacroBar';
import { useDiaryStore } from '../../store/diaryStore';
import { useUserStore } from '../../store/userStore';
import { useInvisibleLog } from '../../hooks/useInvisibleLog';
import { useTranslation } from '../../hooks/useTranslation';
import { api } from '../../services/api';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { profile } = useUserStore();
  const { todayTotals, loadToday } = useDiaryStore();
  const { status, loadStatus } = useInvisibleLog();
  const [voiceInput, setVoiceInput] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [askingAI, setAskingAI] = useState(false);
  const [selectedMood, setSelectedMood] = useState('');
  const [moodSuggestion, setMoodSuggestion] = useState('');
  const [loadingMood, setLoadingMood] = useState(false);

  useEffect(() => {
    loadToday();
    loadStatus();
  }, []);

  const handleSnap = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/camera/PlateMode');
  };

  const handleFridgeScan = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/camera/FridgeMode');
  };

  const handleAskAI = async () => {
    if (!voiceInput.trim() || askingAI) return;
    setAskingAI(true);
    try {
      const { data } = await api.post('/voice/query', { message: voiceInput });
      setAiReply(data.reply);
      setVoiceInput('');
    } catch {
      setAiReply(t('errors.aiUnavailable'));
    } finally {
      setAskingAI(false);
    }
  };

  const handleMoodSelect = async (mood: string) => {
    setSelectedMood(mood);
    setLoadingMood(true);
    try {
      const { data } = await api.post('/voice/mood', { mood });
      setMoodSuggestion(data.suggestions);
    } catch {
      setMoodSuggestion('Try drinking a glass of water and having a small balanced snack.');
    } finally {
      setLoadingMood(false);
    }
  };

  const calorieTarget = profile?.calorieTarget || 2000;
  const eatenToday = todayTotals.calories || 0;
  const remaining = Math.max(0, calorieTarget - eatenToday);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{t('home.greeting', { name: profile?.name?.split(' ')[0] || '' })}</Text>
              <Text style={styles.date}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/diet/DietSelector')} style={styles.dietBadge}>
              <Text style={styles.dietBadgeText}>{(profile?.dietPlan || 'mediterranean').toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {/* Calorie Ring */}
          <CalorieRing
            eaten={eatenToday}
            target={calorieTarget}
            burned={status?.totalBurned || 0}
          />

          {/* Status message */}
          {status?.message && (
            <View style={styles.statusCard}>
              <Text style={styles.statusText}>💬 {status.message}</Text>
            </View>
          )}

          {/* Macro bars */}
          <View style={styles.macroSection}>
            <MacroBar label={t('macros.protein')} current={todayTotals.proteinG || 0} target={Math.round((calorieTarget * 0.25) / 4)} color={COLORS.protein} unit="g" />
            <MacroBar label={t('macros.carbs')} current={todayTotals.carbsG || 0} target={Math.round((calorieTarget * 0.50) / 4)} color={COLORS.carbs} unit="g" />
            <MacroBar label={t('macros.fat')} current={todayTotals.fatG || 0} target={Math.round((calorieTarget * 0.25) / 9)} color={COLORS.fat} unit="g" />
          </View>

          {/* SNAP Button */}
          <TouchableOpacity style={styles.snapButton} onPress={handleSnap} activeOpacity={0.85}>
            <Text style={styles.snapIcon}>📸</Text>
            <Text style={styles.snapLabel}>{t('home.snapMeal')}</Text>
            <Text style={styles.snapSub}>{t('home.snapMealSub')}</Text>
          </TouchableOpacity>

          {/* Secondary actions */}
          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleFridgeScan}>
              <Text style={styles.secondaryIcon}>🧊</Text>
              <Text style={styles.secondaryLabel}>{t('home.scanFridge')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/camera/BarcodeMode')}>
              <Text style={styles.secondaryIcon}>📦</Text>
              <Text style={styles.secondaryLabel}>{t('home.scanBarcode')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/camera/LabelMode')}>
              <Text style={styles.secondaryIcon}>🏷️</Text>
              <Text style={styles.secondaryLabel}>Scan Label</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/camera/ReceiptMode')}>
              <Text style={styles.secondaryIcon}>🧾</Text>
              <Text style={styles.secondaryLabel}>Receipt</Text>
            </TouchableOpacity>
          </View>

          {/* Mood Coach */}
          <View style={styles.moodCard}>
            <Text style={styles.moodTitle}>🌡️ How are you feeling?</Text>
            <Text style={styles.moodSub}>Get food suggestions based on your mood</Text>
            <View style={styles.moodRow}>
              {[
                { key: 'tired', label: '😴 Tired' },
                { key: 'stressed', label: '😰 Stressed' },
                { key: 'energized', label: '💪 Energized' },
                { key: 'sick', label: '🤒 Sick' },
                { key: 'bloated', label: '😣 Bloated' },
              ].map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.moodBtn, selectedMood === key && styles.moodBtnActive]}
                  onPress={() => handleMoodSelect(key)}
                >
                  <Text style={[styles.moodBtnText, selectedMood === key && styles.moodBtnTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {loadingMood && (
              <View style={styles.moodLoading}>
                <Text style={styles.moodLoadingText}>Getting suggestions...</Text>
              </View>
            )}
            {moodSuggestion && !loadingMood && (
              <View style={styles.moodReply}>
                <Text style={styles.moodReplyText}>{moodSuggestion}</Text>
              </View>
            )}
          </View>

          {/* AI Voice Q&A Bar */}
          <View style={styles.voiceBar}>
            <Text style={styles.voiceBarTitle}>{t('home.askCoach')}</Text>
            <View style={styles.voiceInputRow}>
              <TextInput
                style={styles.voiceInput}
                placeholder={t('home.voicePlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                value={voiceInput}
                onChangeText={setVoiceInput}
                onSubmitEditing={handleAskAI}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.sendBtn, askingAI && styles.sendBtnDisabled]}
                onPress={handleAskAI}
                disabled={askingAI}
              >
                <Text style={styles.sendBtnText}>{askingAI ? '...' : '→'}</Text>
              </TouchableOpacity>
            </View>
            {aiReply ? (
              <View style={styles.aiReplyCard}>
                <Text style={styles.aiReplyText}>🤖 {aiReply}</Text>
              </View>
            ) : null}
            <View style={styles.voiceHints}>
              {[t('home.hint1'), t('home.hint2'), t('home.hint3')].map((hint, i) => (
                <TouchableOpacity key={i} onPress={() => setVoiceInput(hint)} style={styles.hintChip}>
                  <Text style={styles.hintText}>{hint}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{remaining}</Text>
              <Text style={styles.statLabel}>{t('home.calRemaining')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{status?.totalBurned || 0}</Text>
              <Text style={styles.statLabel}>{t('home.calBurned')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{todayTotals.fiberG || 0}g</Text>
              <Text style={styles.statLabel}>{t('macros.fiber')}</Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.base, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  greeting: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary },
  date: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  dietBadge: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  dietBadgeText: { color: '#fff', fontSize: FONTS.sizes.xs, fontWeight: '700', letterSpacing: 0.5 },
  statusCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, marginVertical: SPACING.md },
  statusText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, lineHeight: 20 },
  macroSection: { gap: SPACING.sm, marginBottom: SPACING.lg },
  snapButton: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.xl,
    alignItems: 'center', marginBottom: SPACING.md,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  snapIcon: { fontSize: 44, marginBottom: SPACING.sm },
  snapLabel: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: '#fff' },
  snapSub: { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  secondaryActions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  secondaryBtn: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center',
  },
  secondaryIcon: { fontSize: 28, marginBottom: 4 },
  secondaryLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center' },
  voiceBar: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.lg },
  voiceBarTitle: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  voiceInputRow: { flexDirection: 'row', gap: SPACING.sm },
  voiceInput: {
    flex: 1, backgroundColor: COLORS.surfaceLight, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.base,
  },
  sendBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 20, justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: COLORS.textMuted },
  sendBtnText: { color: '#fff', fontSize: FONTS.sizes.lg, fontWeight: '700' },
  aiReplyCard: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.sm, marginTop: SPACING.sm },
  aiReplyText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, lineHeight: 20 },
  voiceHints: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.sm },
  hintChip: { backgroundColor: COLORS.surfaceLight, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  hintText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  moodCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.lg },
  moodTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  moodSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginBottom: SPACING.md },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  moodBtn: { backgroundColor: COLORS.surfaceLight, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'transparent' },
  moodBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  moodBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  moodBtnTextActive: { color: '#fff' },
  moodLoading: { marginTop: SPACING.md, alignItems: 'center' },
  moodLoadingText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  moodReply: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.md },
  moodReplyText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center' },
  statValue: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
});
