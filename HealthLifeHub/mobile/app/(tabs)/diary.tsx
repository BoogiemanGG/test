/**
 * Diary Screen — The Invisible Log
 * Shows all food entries for today, grouped by meal, with totals
 */
import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  SafeAreaView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { COLORS, SPACING, RADIUS, FONTS } from '../../constants/theme';
import { useDiaryStore } from '../../store/diaryStore';
import { useTranslation } from '../../hooks/useTranslation';

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎',
};

export default function DiaryScreen() {
  const { t } = useTranslation();
  const { todayEntries, todayTotals, loadToday, deleteEntry } = useDiaryStore();

  useEffect(() => { loadToday(); }, []);

  // Group by meal type
  const sections = ['breakfast', 'lunch', 'dinner', 'snack']
    .map(meal => ({
      title: meal,
      data: todayEntries.filter(e => e.mealType === meal),
    }))
    .filter(s => s.data.length > 0);

  const handleDelete = (id: string) => {
    Alert.alert(t('diary.deleteTitle'), t('diary.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteEntry(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Daily Totals Header */}
      <View style={styles.totalsBar}>
        <TotalStat label={t('macros.calories')} value={String(Math.round(todayTotals.calories || 0))} color={COLORS.primary} />
        <TotalStat label={t('macros.protein')} value={`${Math.round(todayTotals.proteinG || 0)}g`} color={COLORS.protein} />
        <TotalStat label={t('macros.carbs')} value={`${Math.round(todayTotals.carbsG || 0)}g`} color={COLORS.carbs} />
        <TotalStat label={t('macros.fat')} value={`${Math.round(todayTotals.fatG || 0)}g`} color={COLORS.fat} />
      </View>

      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>{t('diary.empty')}</Text>
          <Text style={styles.emptySub}>{t('diary.emptySub')}</Text>
          <TouchableOpacity style={styles.snapCta} onPress={() => router.push('/camera/PlateMode')}>
            <Text style={styles.snapCtaText}>📸 {t('home.snapMeal')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>{MEAL_ICONS[title]}</Text>
              <Text style={styles.sectionTitle}>{t(`meals.${title}`)}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.entryCard}>
              <View style={styles.entryLeft}>
                <Text style={styles.entryName}>{item.food?.name || item.recipe?.title || t('diary.unknown')}</Text>
                <Text style={styles.entryMeta}>{Math.round(item.quantityG)}g · {t('diary.at')} {new Date(item.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <View style={styles.entryRight}>
                <Text style={styles.entryCalories}>{Math.round(item.calories)}</Text>
                <Text style={styles.entryCalUnit}>{t('macros.kcal')}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          ListFooterComponent={() => (
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/camera/PlateMode')}>
              <Text style={styles.addBtnText}>+ {t('diary.addFood')}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function TotalStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.totalStat}>
      <Text style={[styles.totalValue, { color }]}>{value}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  totalsBar: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.base,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  totalStat: { flex: 1, alignItems: 'center' },
  totalValue: { fontSize: FONTS.sizes.lg, fontWeight: '800' },
  totalLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  list: { padding: SPACING.base, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg, marginBottom: SPACING.sm },
  sectionIcon: { fontSize: 20, marginRight: SPACING.sm },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'capitalize' },
  entryCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  entryLeft: { flex: 1 },
  entryName: { fontSize: FONTS.sizes.base, fontWeight: '600', color: COLORS.textPrimary },
  entryMeta: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 2 },
  entryRight: { alignItems: 'flex-end', marginRight: SPACING.sm },
  entryCalories: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.primary },
  entryCalUnit: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  deleteBtn: { padding: SPACING.xs },
  deleteBtnText: { color: COLORS.textMuted, fontSize: FONTS.sizes.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  emptyIcon: { fontSize: 60, marginBottom: SPACING.lg },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: FONTS.sizes.base, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },
  snapCta: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.xl },
  snapCtaText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.base },
  addBtn: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  addBtnText: { color: COLORS.primary, fontWeight: '600' },
});
