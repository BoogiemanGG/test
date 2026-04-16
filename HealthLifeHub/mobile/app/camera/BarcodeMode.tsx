import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, FONTS } from '../../constants/theme';
import { api } from '../../services/api';
import { useDiaryStore } from '../../store/diaryStore';

interface FoodInfo {
  id: string; name: string; caloriesPer100g: number;
  proteinPer100g: number; carbsPer100g: number; fatPer100g: number;
}

export default function BarcodeModeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [food, setFood] = useState<FoodInfo | null>(null);
  const [servingG, setServingG] = useState(100);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('snack');
  const { addEntry } = useDiaryStore();

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.permContainer}>
        <Text style={styles.permText}>📷  Camera access needed to scan barcodes</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcode = async ({ data: barcode }: { data: string }) => {
    if (!scanning || loading) return;
    setScanning(false);
    setLoading(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const { data } = await api.post('/food/analyze-barcode', { barcode });
      setFood(data);
    } catch {
      Alert.alert('Not found', 'This product was not found. Try another barcode.', [
        { text: 'Scan again', onPress: () => { setScanning(true); setLoading(false); } },
        { text: 'Cancel', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLog = async () => {
    if (!food) return;
    const factor = servingG / 100;
    try {
      await addEntry({
        foodName: food.name,
        quantityG: servingG,
        calories: Math.round(food.caloriesPer100g * factor),
        proteinG: Math.round(food.proteinPer100g * factor * 10) / 10,
        carbsG: Math.round(food.carbsPer100g * factor * 10) / 10,
        fatG: Math.round(food.fatPer100g * factor * 10) / 10,
        mealType,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Logged!', `${food.name} added to your diary.`, [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not log food. Please try again.');
    }
  };

  if (food) {
    const factor = servingG / 100;
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <Text style={styles.foodName}>{food.name}</Text>
          <Text style={styles.barcodeLabel}>📦 Scanned product</Text>

          <View style={styles.macroGrid}>
            {[
              { label: 'Calories', value: Math.round(food.caloriesPer100g * factor), unit: 'kcal', color: COLORS.primary },
              { label: 'Protein', value: Math.round(food.proteinPer100g * factor * 10) / 10, unit: 'g', color: COLORS.protein },
              { label: 'Carbs', value: Math.round(food.carbsPer100g * factor * 10) / 10, unit: 'g', color: COLORS.carbs },
              { label: 'Fat', value: Math.round(food.fatPer100g * factor * 10) / 10, unit: 'g', color: COLORS.fat },
            ].map(m => (
              <View key={m.label} style={styles.macroCard}>
                <Text style={[styles.macroValue, { color: m.color }]}>{m.value}</Text>
                <Text style={styles.macroUnit}>{m.unit}</Text>
                <Text style={styles.macroLabel}>{m.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Serving size (g)</Text>
          <View style={styles.servingRow}>
            {[50, 100, 150, 200].map(g => (
              <TouchableOpacity
                key={g}
                style={[styles.servingBtn, servingG === g && styles.servingBtnActive]}
                onPress={() => setServingG(g)}
              >
                <Text style={[styles.servingBtnText, servingG === g && styles.servingBtnTextActive]}>{g}g</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Meal type</Text>
          <View style={styles.mealRow}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.mealBtn, mealType === m && styles.mealBtnActive]}
                onPress={() => setMealType(m)}
              >
                <Text style={[styles.mealBtnText, mealType === m && styles.mealBtnTextActive]}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.logBtn} onPress={handleLog}>
            <Text style={styles.logBtnText}>Log to Diary</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.retakeBtn} onPress={() => { setFood(null); setScanning(true); }}>
            <Text style={styles.retakeBtnText}>Scan Another</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanning ? handleBarcode : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.scanFrame}>
            <View style={styles.scanLine} />
          </View>
          {loading
            ? <ActivityIndicator color={COLORS.primary} size="large" />
            : <Text style={styles.hint}>Point camera at a barcode</Text>}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center', padding: SPACING.xl },
  closeBtn: {
    alignSelf: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: RADIUS.full, width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scanFrame: {
    width: '80%', height: 120, borderWidth: 2, borderColor: COLORS.primary,
    borderRadius: RADIUS.md, justifyContent: 'center', overflow: 'hidden',
  },
  scanLine: { height: 2, backgroundColor: COLORS.primary, opacity: 0.8 },
  hint: { color: 'rgba(255,255,255,0.8)', fontSize: FONTS.sizes.sm, textAlign: 'center', marginBottom: 40 },
  permContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  permText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, textAlign: 'center', marginBottom: SPACING.xl },
  permBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.md },
  resultScroll: { padding: SPACING.base, paddingBottom: 60 },
  foodName: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  barcodeLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginBottom: SPACING.lg },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  macroCard: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center',
  },
  macroValue: { fontSize: FONTS.sizes.xl, fontWeight: '800' },
  macroUnit: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  macroLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  sectionLabel: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  servingRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  servingBtn: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: 'transparent',
  },
  servingBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  servingBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  servingBtnTextActive: { color: '#fff' },
  mealRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl, flexWrap: 'wrap' },
  mealBtn: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderWidth: 1, borderColor: 'transparent',
  },
  mealBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  mealBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  mealBtnTextActive: { color: '#fff' },
  logBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, alignItems: 'center',
  },
  logBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.md },
  retakeBtn: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.sm,
  },
  retakeBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },
});
