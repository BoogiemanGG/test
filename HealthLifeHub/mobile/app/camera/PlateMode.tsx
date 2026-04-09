/**
 * PlateMode — Snap a meal photo → instant calorie count + macros
 */
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, FONTS } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import { api } from '../../services/api';
import { useDiaryStore } from '../../store/diaryStore';

export default function PlateMode() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [mealType, setMealType] = useState('');
  const cameraRef = useRef<any>(null);
  const { addEntry } = useDiaryStore();

  if (!permission?.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Text style={styles.permissionText}>{t('camera.needPermission')}</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>{t('camera.grantPermission')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || analyzing) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setAnalyzing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      const formData = new FormData();
      formData.append('photo', { uri: photo.uri, type: 'image/jpeg', name: 'meal.jpg' } as any);
      const { data } = await api.post('/food/analyze-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const logFood = async () => {
    if (!result) return;
    await addEntry({
      mealType: mealType || 'snack',
      calories: result.totalCalories,
      proteinG: result.totalProteinG,
      carbsG: result.totalCarbsG,
      fatG: result.totalFatG,
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View style={styles.container}>
      {!result ? (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            {/* Viewfinder overlay */}
            <View style={styles.overlay}>
              <View style={styles.corner} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.cameraHint}>{t('camera.plateModeHint')}</Text>
          </CameraView>

          <View style={styles.controls}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backBtnText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.snapBtn} onPress={takePicture} disabled={analyzing}>
              {analyzing ? <ActivityIndicator color="#fff" /> : <View style={styles.snapBtnInner} />}
            </TouchableOpacity>
            <View style={{ width: 44 }} />
          </View>
        </>
      ) : (
        <ScrollView style={styles.resultContainer} contentContainerStyle={{ padding: SPACING.base }}>
          <Text style={styles.resultTitle}>{t('camera.analysisComplete')}</Text>

          {/* Calorie big number */}
          <View style={styles.calorieCard}>
            <Text style={styles.calorieNumber}>{result.totalCalories}</Text>
            <Text style={styles.calorieUnit}>{t('macros.kcal')}</Text>
          </View>

          {/* Macros */}
          <View style={styles.macroRow}>
            <MacroChip label={t('macros.protein')} value={`${result.totalProteinG}g`} color={COLORS.protein} />
            <MacroChip label={t('macros.carbs')} value={`${result.totalCarbsG}g`} color={COLORS.carbs} />
            <MacroChip label={t('macros.fat')} value={`${result.totalFatG}g`} color={COLORS.fat} />
          </View>

          {/* Plate Score */}
          <View style={styles.plateScoreCard}>
            <Text style={styles.plateScoreLabel}>{t('camera.plateScore')}</Text>
            <Text style={styles.plateScoreValue}>{result.plateScoreOut100}/100</Text>
          </View>

          {/* Detected items */}
          {result.detectedItems?.length > 0 && (
            <View style={styles.detectedSection}>
              <Text style={styles.detectedTitle}>{t('camera.detected')}</Text>
              {result.detectedItems.map((item: any, i: number) => (
                <View key={i} style={styles.detectedItem}>
                  <Text style={styles.detectedName}>{item.name}</Text>
                  <Text style={styles.detectedCal}>{Math.round(item.calories)} kcal</Text>
                </View>
              ))}
            </View>
          )}

          {/* AI Suggestions */}
          {result.suggestions?.map((s: string, i: number) => (
            <View key={i} style={styles.suggestionCard}>
              <Text style={styles.suggestionText}>💬 {s}</Text>
            </View>
          ))}

          {/* Meal type selector */}
          <Text style={styles.mealTypeLabel}>{t('camera.mealType')}</Text>
          <View style={styles.mealTypeRow}>
            {['breakfast', 'lunch', 'dinner', 'snack'].map(m => (
              <TouchableOpacity key={m} style={[styles.mealTypeBtn, mealType === m && styles.mealTypeBtnActive]} onPress={() => setMealType(m)}>
                <Text style={styles.mealTypeBtnText}>{t(`meals.${m}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.retakeBtn} onPress={() => setResult(null)}>
              <Text style={styles.retakeBtnText}>{t('camera.retake')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logBtn} onPress={logFood}>
              <Text style={styles.logBtnText}>{t('camera.logFood')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function MacroChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.macroChip, { borderColor: color }]}>
      <Text style={[styles.macroChipValue, { color }]}>{value}</Text>
      <Text style={styles.macroChipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { position: 'absolute', top: '20%', left: '10%', right: '10%', bottom: '30%' },
  corner: { position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#fff' },
  cornerTR: { top: 0, left: undefined, right: 0, borderLeftWidth: 0, borderRightWidth: 3 },
  cornerBL: { top: undefined, bottom: 0, borderTopWidth: 0, borderBottomWidth: 3 },
  cornerBR: { top: undefined, bottom: 0, left: undefined, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  cameraHint: { position: 'absolute', bottom: '25%', width: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: FONTS.sizes.sm },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.xl, paddingBottom: 50, backgroundColor: 'rgba(0,0,0,0.5)' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: '#fff', fontSize: 20 },
  snapBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  snapBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary },
  resultContainer: { flex: 1, backgroundColor: COLORS.background },
  resultTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.lg },
  calorieCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.md },
  calorieNumber: { fontSize: 72, fontWeight: '900', color: COLORS.primary },
  calorieUnit: { fontSize: FONTS.sizes.md, color: COLORS.textMuted },
  macroRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  macroChip: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', borderWidth: 1 },
  macroChipValue: { fontSize: FONTS.sizes.lg, fontWeight: '800' },
  macroChipLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  plateScoreCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  plateScoreLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base },
  plateScoreValue: { color: COLORS.primary, fontWeight: '800', fontSize: FONTS.sizes.base },
  detectedSection: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  detectedTitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginBottom: SPACING.sm },
  detectedItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs },
  detectedName: { color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, textTransform: 'capitalize' },
  detectedCal: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  suggestionCard: { backgroundColor: '#1E3A2F', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  suggestionText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, lineHeight: 20 },
  mealTypeLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  mealTypeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  mealTypeBtn: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center' },
  mealTypeBtnActive: { backgroundColor: COLORS.primary },
  mealTypeBtnText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.xs, fontWeight: '600', textTransform: 'capitalize' },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  retakeBtn: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  retakeBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  logBtn: { flex: 2, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  logBtnText: { color: '#fff', fontWeight: '800', fontSize: FONTS.sizes.base },
  permissionScreen: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  permissionText: { color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.lg },
  permissionBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md, paddingHorizontal: SPACING.xl },
  permissionBtnText: { color: '#fff', fontWeight: '700' },
});
