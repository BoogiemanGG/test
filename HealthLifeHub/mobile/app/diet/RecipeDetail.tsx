import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

interface Ingredient { ingredientName: string; quantity: number; unit: string; }
interface Recipe {
  id: string; title: string; caloriesServing: number; proteinServing: number;
  carbsServing: number; fatServing: number; fiberServing: number; sodiumServing: number;
  prepTimeMins: number; servings: number; cuisine: string | null;
  instructions: string; dietDash: boolean; dietMed: boolean; dietFlex: boolean;
  ingredients: Ingredient[];
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/recipes/${id}`)
      .then(({ data }) => setRecipe(data))
      .catch(() => Alert.alert('Error', 'Could not load recipe.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    try {
      await api.post(`/recipes/${id}/save`);
      setSaved(true);
      Alert.alert('Saved!', 'Recipe added to your cookbook.');
    } catch {
      Alert.alert('Error', 'Could not save recipe.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Recipe not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const steps = recipe.instructions.split(/Step \d+:|\.(?:\s+Step)|\n/).filter(s => s.trim().length > 5);

  const dietTags = [
    recipe.dietDash && { label: 'DASH', color: COLORS.dash },
    recipe.dietMed && { label: 'Mediterranean', color: COLORS.mediterranean },
    recipe.dietFlex && { label: 'Flexitarian', color: COLORS.flexitarian },
  ].filter(Boolean) as { label: string; color: string }[];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnSaved]}
          onPress={handleSave}
          disabled={saved}
        >
          <Text style={styles.saveBtnText}>{saved ? '✓ Saved' : '🔖 Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroEmoji}>
          <Text style={{ fontSize: 72 }}>🍽️</Text>
        </View>

        <Text style={styles.title}>{recipe.title}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>⏱ {recipe.prepTimeMins} min</Text>
          <Text style={styles.meta}>👤 {recipe.servings} servings</Text>
          {recipe.cuisine && <Text style={styles.meta}>🌍 {recipe.cuisine}</Text>}
        </View>

        {dietTags.length > 0 && (
          <View style={styles.tagsRow}>
            {dietTags.map(t => (
              <View key={t.label} style={[styles.tag, { backgroundColor: t.color + '22' }]}>
                <Text style={[styles.tagText, { color: t.color }]}>{t.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Nutrition */}
        <Text style={styles.sectionTitle}>Nutrition per serving</Text>
        <View style={styles.macroGrid}>
          {[
            { label: 'Calories', value: recipe.caloriesServing, unit: 'kcal', color: COLORS.primary },
            { label: 'Protein', value: recipe.proteinServing, unit: 'g', color: COLORS.protein },
            { label: 'Carbs', value: recipe.carbsServing, unit: 'g', color: COLORS.carbs },
            { label: 'Fat', value: recipe.fatServing, unit: 'g', color: COLORS.fat },
            { label: 'Fiber', value: recipe.fiberServing, unit: 'g', color: COLORS.fiber },
            { label: 'Sodium', value: recipe.sodiumServing, unit: 'mg', color: COLORS.textMuted },
          ].map(m => (
            <View key={m.label} style={styles.macroCard}>
              <Text style={[styles.macroValue, { color: m.color }]}>{m.value}</Text>
              <Text style={styles.macroUnit}>{m.unit}</Text>
              <Text style={styles.macroLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Ingredients */}
        <Text style={styles.sectionTitle}>Ingredients</Text>
        <View style={styles.card}>
          {recipe.ingredients.map((ing, i) => (
            <View key={i} style={styles.ingredientRow}>
              <View style={styles.bullet} />
              <Text style={styles.ingredientText}>
                <Text style={styles.ingredientQty}>{ing.quantity} {ing.unit} </Text>
                {ing.ingredientName}
              </Text>
            </View>
          ))}
        </View>

        {/* Instructions */}
        <Text style={styles.sectionTitle}>Instructions</Text>
        <View style={styles.card}>
          {steps.length > 1 ? (
            steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step.trim()}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.instructionsText}>{recipe.instructions}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  errorText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },
  linkText: { color: COLORS.primary, fontSize: FONTS.sizes.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base },
  backBtn: { padding: SPACING.sm },
  backText: { color: COLORS.primary, fontSize: FONTS.sizes.base },
  saveBtn: { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnSaved: { backgroundColor: COLORS.primary },
  saveBtnText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  scroll: { padding: SPACING.base, paddingBottom: 80 },
  heroEmoji: { alignItems: 'center', marginBottom: SPACING.md },
  title: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.sm, textAlign: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.base, marginBottom: SPACING.md },
  meta: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  tagsRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
  tag: { borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4 },
  tagText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm, marginTop: SPACING.lg },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  macroCard: {
    width: '30%', flex: 1, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center',
  },
  macroValue: { fontSize: FONTS.sizes.lg, fontWeight: '800' },
  macroUnit: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  macroLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 7 },
  ingredientText: { flex: 1, color: COLORS.textSecondary, fontSize: FONTS.sizes.base, lineHeight: 22 },
  ingredientQty: { color: COLORS.textPrimary, fontWeight: '600' },
  stepRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md, alignItems: 'flex-start' },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  stepNumText: { color: '#fff', fontSize: FONTS.sizes.sm, fontWeight: '700' },
  stepText: { flex: 1, color: COLORS.textSecondary, fontSize: FONTS.sizes.base, lineHeight: 22 },
  instructionsText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, lineHeight: 24 },
});
