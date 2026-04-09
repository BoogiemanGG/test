/**
 * RecipeTrio — Shows 3 recipe cards, one per diet plan (DASH, Med, Flex)
 * Used after fridge scan to give "Triple-Gold" recipe suggestions
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { COLORS, SPACING, RADIUS, FONTS } from '../constants/theme';
import { useTranslation } from '../hooks/useTranslation';

interface Recipe {
  id: string;
  title: string;
  imageUrl?: string;
  caloriesServing: number;
  prepTimeMins: number;
  proteinServing: number;
}

interface RecipeTrioProps {
  dash?: Recipe[];
  mediterranean?: Recipe[];
  flexitarian?: Recipe[];
  onSelect?: (recipe: Recipe, diet: string) => void;
}

const DIET_CONFIG = {
  dash: { label: 'DASH', icon: '❤️', color: COLORS.dash, tagline: 'Heart health · Low sodium' },
  mediterranean: { label: 'Mediterranean', icon: '🫒', color: COLORS.mediterranean, tagline: 'Longevity · Healthy fats' },
  flexitarian: { label: 'Flexitarian', icon: '🥗', color: COLORS.flexitarian, tagline: 'Weight loss · Plant-forward' },
};

export function RecipeTrio({ dash = [], mediterranean = [], flexitarian = [] }: RecipeTrioProps) {
  const { t } = useTranslation();

  const dietGroups = [
    { key: 'dash', recipes: dash },
    { key: 'mediterranean', recipes: mediterranean },
    { key: 'flexitarian', recipes: flexitarian },
  ] as const;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('recipes.trioTitle')}</Text>
      <Text style={styles.subtitle}>{t('recipes.trioSubtitle')}</Text>

      {dietGroups.map(({ key, recipes }) => {
        const config = DIET_CONFIG[key];
        if (!recipes.length) return null;

        return (
          <View key={key} style={styles.dietSection}>
            <View style={styles.dietHeader}>
              <Text style={styles.dietIcon}>{config.icon}</Text>
              <View>
                <Text style={[styles.dietName, { color: config.color }]}>{config.label}</Text>
                <Text style={styles.dietTagline}>{config.tagline}</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recipeScroll}>
              {recipes.map(recipe => (
                <TouchableOpacity
                  key={recipe.id}
                  style={styles.recipeCard}
                  onPress={() => router.push({ pathname: '/diet/RecipeDetail', params: { id: recipe.id } })}
                >
                  {recipe.imageUrl ? (
                    <Image source={{ uri: recipe.imageUrl }} style={styles.recipeImage} />
                  ) : (
                    <View style={[styles.recipeImage, styles.recipeImageFallback]}>
                      <Text style={{ fontSize: 32 }}>{config.icon}</Text>
                    </View>
                  )}
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeTitle} numberOfLines={2}>{recipe.title}</Text>
                    <View style={styles.recipeMeta}>
                      <Text style={styles.recipeCalText}>🔥 {Math.round(recipe.caloriesServing)}</Text>
                      <Text style={styles.recipeTimeText}>⏱ {recipe.prepTimeMins}m</Text>
                    </View>
                    <View style={[styles.dietPill, { backgroundColor: config.color + '22', borderColor: config.color }]}>
                      <Text style={[styles.dietPillText, { color: config.color }]}>{config.label}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: SPACING.md },
  title: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginBottom: SPACING.lg },
  dietSection: { marginBottom: SPACING.xl },
  dietHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  dietIcon: { fontSize: 28 },
  dietName: { fontSize: FONTS.sizes.md, fontWeight: '700' },
  dietTagline: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  recipeScroll: { marginLeft: -SPACING.base, paddingLeft: SPACING.base },
  recipeCard: { width: 160, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', marginRight: SPACING.sm },
  recipeImage: { width: '100%', height: 100 },
  recipeImageFallback: { backgroundColor: COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  recipeInfo: { padding: SPACING.sm },
  recipeTitle: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 18, marginBottom: SPACING.xs },
  recipeMeta: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xs },
  recipeCalText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  recipeTimeText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  dietPill: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  dietPillText: { fontSize: 10, fontWeight: '700' },
});
