/**
 * Recipes Screen — Browse + save recipes filtered by diet plan
 * Shows DASH / Mediterranean / Flexitarian recipe tabs with photos
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, TextInput, Image, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { COLORS, SPACING, RADIUS, FONTS } from '../../constants/theme';
import { useUserStore } from '../../store/userStore';
import { useTranslation } from '../../hooks/useTranslation';
import { api } from '../../services/api';

const DIET_TABS = [
  { id: 'all', label: 'All', icon: '🍽️' },
  { id: 'dash', label: 'DASH', icon: '❤️', color: COLORS.dash },
  { id: 'mediterranean', label: 'Med', icon: '🫒', color: COLORS.mediterranean },
  { id: 'flexitarian', label: 'Flex', icon: '🥗', color: COLORS.flexitarian },
];

export default function RecipesScreen() {
  const { t } = useTranslation();
  const { profile } = useUserStore();
  const [activeTab, setActiveTab] = useState(profile?.dietPlan || 'all');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => { fetchRecipes(); }, [activeTab]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const params: any = { page: 1 };
      if (activeTab !== 'all') params.diet = activeTab;
      if (searchQuery) params.q = searchQuery;
      const { data } = await api.get('/recipes', { params });
      setRecipes(data);
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSaved = async () => {
    try {
      const { data } = await api.get('/recipes/user/saved');
      setRecipes(data.map((s: any) => s.recipe));
    } catch {
      setRecipes([]);
    }
  };

  const toggleSaved = () => {
    setShowSaved(s => !s);
    if (!showSaved) fetchSaved();
    else fetchRecipes();
  };

  const saveRecipe = async (id: string) => {
    try {
      if (savedIds.has(id)) {
        await api.delete(`/recipes/${id}/save`);
        setSavedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      } else {
        await api.post(`/recipes/${id}/save`);
        setSavedIds(prev => new Set([...prev, id]));
      }
    } catch { /* silent */ }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder={`🔍 ${t('recipes.search')}`}
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchRecipes}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={toggleSaved} style={[styles.savedToggle, showSaved && styles.savedToggleActive]}>
          <Text style={styles.savedToggleText}>{showSaved ? '🔖' : '📖'} {t(showSaved ? 'recipes.cookbook' : 'recipes.browse')}</Text>
        </TouchableOpacity>
      </View>

      {/* Diet tabs */}
      {!showSaved && (
        <View style={styles.tabs}>
          {DIET_TABS.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: SPACING.sm }}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🍳</Text>
              <Text style={styles.emptyText}>{t('recipes.empty')}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.recipeCard}
              onPress={() => router.push({ pathname: '/diet/RecipeDetail', params: { id: item.id } })}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.recipeImage} />
              ) : (
                <View style={[styles.recipeImage, styles.recipeImagePlaceholder]}>
                  <Text style={{ fontSize: 40 }}>🍽️</Text>
                </View>
              )}
              <View style={styles.recipeInfo}>
                <Text style={styles.recipeTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.recipeMeta}>
                  <Text style={styles.recipeCalories}>🔥 {Math.round(item.caloriesServing)} kcal</Text>
                  <Text style={styles.recipeTime}>⏱ {item.prepTimeMins}m</Text>
                </View>
                <View style={styles.recipeDietTags}>
                  {item.dietDash && <Text style={styles.dietTag}>❤️</Text>}
                  {item.dietMed && <Text style={styles.dietTag}>🫒</Text>}
                  {item.dietFlex && <Text style={styles.dietTag}>🥗</Text>}
                  {item.dietVegan && <Text style={styles.dietTag}>🌱</Text>}
                </View>
              </View>
              <TouchableOpacity
                style={styles.heartBtn}
                onPress={() => saveRecipe(String(item.id))}
              >
                <Text style={{ fontSize: 20 }}>{savedIds.has(String(item.id)) ? '❤️' : '🤍'}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.base, paddingBottom: 0 },
  searchInput: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.base,
  },
  savedToggle: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, justifyContent: 'center' },
  savedToggleActive: { backgroundColor: COLORS.primary },
  savedToggleText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  tabs: { flexDirection: 'row', paddingHorizontal: SPACING.base, paddingTop: SPACING.md, gap: SPACING.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingVertical: SPACING.sm },
  tabActive: { backgroundColor: COLORS.primary },
  tabIcon: { fontSize: 14 },
  tabLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  tabLabelActive: { color: '#fff' },
  grid: { padding: SPACING.base, paddingBottom: 100, gap: SPACING.sm },
  recipeCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', maxWidth: '50%' },
  recipeImage: { width: '100%', height: 130, backgroundColor: COLORS.surfaceLight },
  recipeImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  recipeInfo: { padding: SPACING.sm },
  recipeTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 18 },
  recipeMeta: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  recipeCalories: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  recipeTime: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  recipeDietTags: { flexDirection: 'row', gap: 4, marginTop: SPACING.xs },
  dietTag: { fontSize: 12 },
  heartBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: RADIUS.full, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 50 },
  emptyText: { color: COLORS.textSecondary, marginTop: SPACING.md },
});
