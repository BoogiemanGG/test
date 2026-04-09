/**
 * Pantry Screen — Fridge & pantry inventory with expiry tracking
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { COLORS, SPACING, RADIUS, FONTS } from '../../constants/theme';
import { usePantryStore } from '../../store/pantryStore';
import { useTranslation } from '../../hooks/useTranslation';

function getFreshnessColor(score: number) {
  if (score > 70) return COLORS.success;
  if (score > 40) return COLORS.warning;
  return COLORS.error;
}

function getDaysUntilExpiry(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function PantryScreen() {
  const { t } = useTranslation();
  const { items, expiringItems, loadPantry, removeItem } = usePantryStore();
  const [showExpiring, setShowExpiring] = useState(false);

  useEffect(() => { loadPantry(); }, []);

  const displayItems = showExpiring ? expiringItems : items;

  const handleDelete = (id: string, name: string) => {
    Alert.alert(t('pantry.deleteTitle'), t('pantry.deleteConfirm', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('pantry.markUsed'), style: 'default', onPress: () => removeItem(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.scanBtn} onPress={() => router.push('/camera/FridgeMode')}>
          <Text style={styles.scanBtnText}>📸 {t('pantry.scanFridge')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/pantry/AddItem')}>
          <Text style={styles.addBtnText}>+ {t('pantry.addItem')}</Text>
        </TouchableOpacity>
      </View>

      {/* Expiring Alert Banner */}
      {expiringItems.length > 0 && (
        <TouchableOpacity
          style={styles.expiryBanner}
          onPress={() => setShowExpiring(!showExpiring)}
        >
          <Text style={styles.expiryBannerText}>
            ⚠️ {t('pantry.expiringCount', { count: expiringItems.length })}
          </Text>
          <Text style={styles.expiryBannerAction}>{showExpiring ? t('pantry.showAll') : t('pantry.viewExpiring')}</Text>
        </TouchableOpacity>
      )}

      {/* Find Recipes Button */}
      {items.length > 0 && (
        <TouchableOpacity
          style={styles.findRecipesBtn}
          onPress={() => router.push({ pathname: '/recipes', params: { fromPantry: '1' } })}
        >
          <Text style={styles.findRecipesBtnText}>🍳 {t('pantry.findRecipes', { count: items.length })}</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={displayItems}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧊</Text>
            <Text style={styles.emptyTitle}>{t('pantry.empty')}</Text>
            <Text style={styles.emptySub}>{t('pantry.emptySub')}</Text>
            <TouchableOpacity style={styles.scanCta} onPress={() => router.push('/camera/FridgeMode')}>
              <Text style={styles.scanCtaText}>📸 {t('pantry.scanFridge')}</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => {
          const daysLeft = getDaysUntilExpiry(item.expiryDate);
          return (
            <View style={styles.itemCard}>
              <View style={[styles.freshnessBar, { backgroundColor: getFreshnessColor(item.freshnessScore) }]} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantityG > 0 ? `${item.quantityG}${item.unit}` : ''}
                  {daysLeft !== null ? ` · ${daysLeft > 0 ? t('pantry.daysLeft', { count: daysLeft }) : t('pantry.expired')}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id, item.itemName)} style={styles.usedBtn}>
                <Text style={styles.usedBtnText}>{t('pantry.used')}</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  actionBar: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.base },
  scanBtn: { flex: 2, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  scanBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.base },
  addBtn: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  addBtnText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: FONTS.sizes.base },
  expiryBanner: { marginHorizontal: SPACING.base, backgroundColor: '#7C2D12', borderRadius: RADIUS.md, padding: SPACING.md, flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  expiryBannerText: { color: '#FCA5A5', fontWeight: '600' },
  expiryBannerAction: { color: '#FCA5A5', textDecorationLine: 'underline' },
  findRecipesBtn: { marginHorizontal: SPACING.base, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.primary },
  findRecipesBtnText: { color: COLORS.primary, fontWeight: '700' },
  list: { padding: SPACING.base, paddingBottom: 100, gap: SPACING.sm },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, overflow: 'hidden' },
  freshnessBar: { width: 4, height: '100%', minHeight: 60 },
  itemInfo: { flex: 1, padding: SPACING.md },
  itemName: { fontSize: FONTS.sizes.base, fontWeight: '600', color: COLORS.textPrimary },
  itemMeta: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 2 },
  usedBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, margin: SPACING.sm, backgroundColor: COLORS.surfaceLight, borderRadius: RADIUS.sm },
  usedBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: SPACING.xl },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.lg, textAlign: 'center' },
  emptySub: { fontSize: FONTS.sizes.base, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
  scanCta: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.xl },
  scanCtaText: { color: '#fff', fontWeight: '700' },
});
