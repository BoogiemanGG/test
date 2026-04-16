import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, FONTS } from '../../constants/theme';
import { api } from '../../services/api';
import { usePantryStore } from '../../store/pantryStore';

interface FridgeItem { name: string; estimatedWeightG: number; unit: string; freshnessScore: number; estimatedExpiry: string | null; }
interface Result { detectedIngredients: FridgeItem[]; recipeSuggestions: { all: any[] }; }

export default function FridgeModeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { loadPantry } = usePantryStore();

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.permContainer}>
        <Text style={styles.permText}>📷  Camera access needed to scan your fridge</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSnap = async () => {
    if (!cameraRef.current || analyzing) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAnalyzing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.7 });
      const formData = new FormData();
      formData.append('photo', { uri: photo!.uri, type: 'image/jpeg', name: 'fridge.jpg' } as any);
      const { data } = await api.post('/food/analyze-fridge', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
    } catch {
      Alert.alert('Could not analyze fridge', 'Please try again with better lighting.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddToPantry = async () => {
    if (!result?.detectedIngredients.length) return;
    setSaving(true);
    try {
      for (const item of result.detectedIngredients) {
        await api.post('/pantry', {
          itemName: item.name,
          quantityG: item.estimatedWeightG,
          unit: item.unit,
          freshnessScore: item.freshnessScore,
          expiryDate: item.estimatedExpiry,
        });
      }
      await loadPantry();
      Alert.alert('Added!', `${result.detectedIngredients.length} items added to your pantry.`, [
        { text: 'Go to Pantry', onPress: () => router.replace('/(tabs)/pantry') },
        { text: 'Stay here', onPress: () => setResult(null) },
      ]);
    } catch {
      Alert.alert('Error', 'Could not save items. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <Text style={styles.resultTitle}>🧊 Fridge Scan Results</Text>
          <Text style={styles.resultSub}>{result.detectedIngredients.length} items detected</Text>

          {result.detectedIngredients.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={[styles.freshDot, { backgroundColor: item.freshnessScore > 70 ? COLORS.success : item.freshnessScore > 40 ? COLORS.warning : COLORS.error }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSub}>{item.estimatedWeightG}{item.unit} · {item.freshnessScore}% fresh</Text>
              </View>
              {item.estimatedExpiry && (
                <Text style={styles.expiry}>
                  {Math.max(0, Math.round((new Date(item.estimatedExpiry).getTime() - Date.now()) / 86400000))}d left
                </Text>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addBtn, saving && { opacity: 0.6 }]}
            onPress={handleAddToPantry}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Add All to Pantry</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.retakeBtn} onPress={() => setResult(null)}>
            <Text style={styles.retakeBtnText}>Scan Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.frame} />
          <Text style={styles.hint}>Point camera at your fridge or pantry</Text>
          <TouchableOpacity style={styles.snapBtn} onPress={handleSnap} disabled={analyzing}>
            {analyzing
              ? <ActivityIndicator color="#fff" size="large" />
              : <View style={styles.snapInner} />}
          </TouchableOpacity>
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
  frame: {
    width: '90%', height: '50%', borderWidth: 2, borderColor: COLORS.primary,
    borderRadius: RADIUS.lg, borderStyle: 'dashed',
  },
  hint: { color: 'rgba(255,255,255,0.8)', fontSize: FONTS.sizes.sm, textAlign: 'center' },
  snapBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 3, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  snapInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff' },
  permContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  permText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, textAlign: 'center', marginBottom: SPACING.xl },
  permBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.md },
  resultScroll: { padding: SPACING.base, paddingBottom: 60 },
  resultTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  resultSub: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginBottom: SPACING.lg },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  freshDot: { width: 10, height: 10, borderRadius: 5 },
  itemName: { color: COLORS.textPrimary, fontSize: FONTS.sizes.base, fontWeight: '600' },
  itemSub: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  expiry: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  addBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.xl,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.md },
  retakeBtn: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.sm,
  },
  retakeBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },
});
