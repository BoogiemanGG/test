import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useUserStore } from '../../store/userStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

const DIETS = [
  {
    key: 'dash',
    name: 'DASH Diet',
    emoji: '❤️',
    color: COLORS.dash,
    tagline: 'Heart-healthy & blood pressure friendly',
    description: 'Low sodium, rich in potassium and fiber. Recommended by doctors to reduce blood pressure and protect your heart.',
    benefits: ['Reduces blood pressure', 'Heart health', 'Low sodium'],
  },
  {
    key: 'mediterranean',
    name: 'Mediterranean',
    emoji: '🫒',
    color: COLORS.mediterranean,
    tagline: 'Longevity & anti-inflammatory',
    description: 'Based on traditional foods from Southern Europe. Emphasizes olive oil, fish, vegetables, legumes, and whole grains.',
    benefits: ['Anti-inflammatory', 'Healthy fats', 'Brain health'],
  },
  {
    key: 'flexitarian',
    name: 'Flexitarian',
    emoji: '🥗',
    color: COLORS.flexitarian,
    tagline: 'Mostly plants, flexible approach',
    description: 'Primarily plant-based diet with occasional meat. Great for sustainability and gradual healthy eating without strict rules.',
    benefits: ['Plant-forward', 'Sustainable', 'Weight management'],
  },
];

export default function DietSelectorScreen() {
  const { profile, updateProfile, isLoading } = useUserStore();
  const [selected, setSelected] = useState(profile?.dietPlan || 'mediterranean');

  const handleSave = async () => {
    try {
      await updateProfile({ dietPlan: selected });
      Alert.alert('Saved!', 'Your diet plan has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not save your diet plan. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Choose Diet Plan</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.subtitle}>Your AI coach will tailor all recipes and suggestions to your chosen plan.</Text>

        {DIETS.map(diet => (
          <TouchableOpacity
            key={diet.key}
            style={[styles.card, selected === diet.key && { borderColor: diet.color, borderWidth: 2 }]}
            onPress={() => setSelected(diet.key)}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.dietEmoji}>{diet.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.dietName}>{diet.name}</Text>
                <Text style={[styles.dietTagline, { color: diet.color }]}>{diet.tagline}</Text>
              </View>
              <View style={[styles.radio, selected === diet.key && { backgroundColor: diet.color, borderColor: diet.color }]}>
                {selected === diet.key && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.dietDesc}>{diet.description}</Text>
            <View style={styles.tagsRow}>
              {diet.benefits.map(b => (
                <View key={b} style={[styles.tag, { backgroundColor: diet.color + '22' }]}>
                  <Text style={[styles.tagText, { color: diet.color }]}>{b}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.saveBtn, isLoading && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveBtnText}>{isLoading ? 'Saving...' : 'Save Diet Plan'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.base },
  backBtn: { padding: SPACING.sm },
  backText: { color: COLORS.primary, fontSize: FONTS.sizes.base },
  title: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { padding: SPACING.base, paddingBottom: 60 },
  subtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginBottom: SPACING.lg, lineHeight: 20 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.base, marginBottom: SPACING.md,
    borderWidth: 2, borderColor: 'transparent',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  dietEmoji: { fontSize: 36 },
  dietName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  dietTagline: { fontSize: FONTS.sizes.xs, fontWeight: '600', marginTop: 2 },
  radio: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  dietDesc: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, lineHeight: 20, marginBottom: SPACING.md },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  tag: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.md,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.md },
});
