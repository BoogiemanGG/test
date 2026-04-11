/**
 * LabelMode — Snap a nutrition label → get exact calories + macros
 * Much more accurate than estimating from food appearance
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, FONTS } from '../../constants/theme';
import { api } from '../../services/api';
import { useDiaryStore } from '../../store/diaryStore';

export default function LabelMode() {
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [mealType, setMealType] = useState('snack');
  const [servings, setServings] = useState(1);
  const cameraRef = useRef<any>(null);
  const { addEntry } = useDiaryStore();

  if (!permission?.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Text style={styles.permissionText}>Camera access is needed to scan nutrition labels.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || analyzing) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setAnalyzing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.9 });
      const formData = new FormData();
      formData.append('photo', { uri: photo.uri, type: 'image/jpeg', name: 'label.jpg' } as any);
      const { data } = await api.post('/food/scan-label', formData, {
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
      mealType,
      calories: Math.round(result.calories * servings),
      proteinG: Math.round(result.proteinG * servings),
      carbsG: Math.round(result.carbsG * servings),
      fatG: Math.round(result.fatG * servings),
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View style={styles.container}>
      {!result ? (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            {/* Label framing guide */}
            <View style={styles.labelGuide}>
              <Text style={styles.guideText}>Align the Nutrition Facts label inside the box</Text>
              <View style={styles.guideBox} />
            </View>
          </CameraView>

          <View style={styles.controls}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backBtnText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.snapBtn} onPress={takePicture} disabled={analyzing}>
              {analyzing
                ? <ActivityIndicator color="#fff" size="large" />
                : <View style={styles.snapBtnInner} />
              }
            </TouchableOpacity>
            <View style={{ width: 44 }} />
          </View>

          {analyzing && (
            <View style={styles.analyzingOverlay}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={styles.analyzingText}>Reading label...</Text>
            </View>
          )}
        </>
      ) : (
        <ScrollView style={styles.resultContainer} contentContainerStyle={{ padding: SPACING.base }}>
          <Text style={styles.productName}>{result.productName}</Text>
          <Text style={styles.servingInfo}>Per serving: {result.servingSize}</Text>

          {/* Big calorie display */}
          <View style={styles.calorieCard}>
            <Text style={styles.calorieNumber}>{Math.round(result.calories * servings)}</Text>
            <Text style={styles.calorieUnit}>kcal</Text>
            {result.servingsPerContainer > 1 && (
              <Text style={styles.servingNote}>{result.servingsPerContainer} servings per container</Text>
            )}
          </View>

          {/* Macro grid */}
          <View style={styles.macroGrid}>
            <MacroCell label="Protein" value={result.proteinG * servings} unit="g" color={COLORS.protein} />
            <MacroCell label="Carbs" value={result.carbsG * servings} unit="g" color={COLORS.carbs} />
            <MacroCell label="Fat" value={result.fatG * servings} unit="g" color={COLORS.fat} />
            <MacroCell label="Fiber" value={result.fiberG * servings} unit="g" color="#22C55E" />
            <MacroCell label="Sugar" value={result.sugarG * servings} unit="g" color="#F59E0B" />
            <MacroCell label="Sodium" value={result.sodiumMg * servings} unit="mg" color="#94A3B8" />
          </View>

          {/* Servings adjuster */}
          <View style={styles.servingsCard}>
            <Text style={styles.servingsLabel}>How many servings?</Text>
            <View style={styles.servingsRow}>
              <TouchableOpacity
                style={styles.servingsBtn}
                onPress={() => setServings(Math.max(0.5, servings - 0.5))}
              >
                <Text style={styles.servingsBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.servingsValue}>{servings}</Text>
              <TouchableOpacity
                style={styles.servingsBtn}
                onPress={() => setServings(servings + 0.5)}
              >
                <Text style={styles.servingsBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Meal type */}
          <Text style={styles.mealTypeLabel}>Log as:</Text>
          <View style={styles.mealTypeRow}>
            {['breakfast', 'lunch', 'dinner', 'snack'].map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.mealTypeBtn, mealType === m && styles.mealTypeBtnActive]}
                onPress={() => setMealType(m)}
              >
                <Text style={styles.mealTypeBtnText}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.retakeBtn} onPress={() => setResult(null)}>
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logBtn} onPress={logFood}>
              <Text style={styles.logBtnText}>Log to Diary</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function MacroCell({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={styles.macroCell}>
      <Text style={[styles.macroCellValue, { color }]}>{Math.round(value * 10) / 10}{unit}</Text>
      <Text style={styles.macroCellLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  labelGuide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.base },
  guideText: { color: 'rgba(255,255,255,0.9)', fontSize: FONTS.sizes.sm, textAlign: 'center', marginBottom: SPACING.md, backgroundColor: 'rgba(0,0,0,0.5)', padding: SPACING.sm, borderRadius: RADIUS.sm },
  guideBox: { width: '80%', height: 200, borderWidth: 2, borderColor: '#fff', borderRadius: RADIUS.md, borderStyle: 'dashed' },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.xl, paddingBottom: 50, backgroundColor: 'rgba(0,0,0,0.5)' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: '#fff', fontSize: 20 },
  snapBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  snapBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary },
  analyzingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  analyzingText: { color: '#fff', marginTop: SPACING.md, fontSize: FONTS.sizes.base },
  resultContainer: { flex: 1, backgroundColor: COLORS.background },
  productName: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  servingInfo: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginBottom: SPACING.md },
  calorieCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.md },
  calorieNumber: { fontSize: 72, fontWeight: '900', color: COLORS.primary },
  calorieUnit: { fontSize: FONTS.sizes.md, color: COLORS.textMuted },
  servingNote: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 4 },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  macroCell: { width: '30%', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', flexGrow: 1 },
  macroCellValue: { fontSize: FONTS.sizes.lg, fontWeight: '800' },
  macroCellLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  servingsCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  servingsLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: SPACING.sm },
  servingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.lg },
  servingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  servingsBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  servingsValue: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary, minWidth: 40, textAlign: 'center' },
  mealTypeLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: SPACING.sm },
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
