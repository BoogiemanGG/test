/**
 * ReceiptMode — Snap a grocery receipt → auto-add all food items to pantry
 * No more typing items one by one
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, FlatList,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, FONTS } from '../../constants/theme';
import { api } from '../../services/api';
import { usePantryStore } from '../../store/pantryStore';

export default function ReceiptMode() {
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ added: number; items: any[] } | null>(null);
  const cameraRef = useRef<any>(null);
  const { loadPantry } = usePantryStore();

  if (!permission?.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Text style={styles.permissionText}>Camera access is needed to scan your receipt.</Text>
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
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.85 });
      const formData = new FormData();
      formData.append('photo', { uri: photo.uri, type: 'image/jpeg', name: 'receipt.jpg' } as any);
      const { data } = await api.post('/pantry/scan-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      await loadPantry();
    } catch {
      setResult({ added: 0, items: [] });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      {!result ? (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.guideContainer}>
              <View style={styles.guideHeader}>
                <Text style={styles.guideTitle}>🧾 Receipt Scanner</Text>
                <Text style={styles.guideSubtitle}>Point camera at your full grocery receipt</Text>
              </View>
              <View style={styles.guideBox} />
              <Text style={styles.guideTip}>Tip: Make sure the whole receipt is visible and well-lit</Text>
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
              <Text style={styles.analyzingText}>Reading your receipt...</Text>
              <Text style={styles.analyzingSubText}>This may take a moment</Text>
            </View>
          )}
        </>
      ) : (
        <ScrollView style={styles.resultContainer} contentContainerStyle={{ padding: SPACING.base }}>
          {result.added > 0 ? (
            <>
              <View style={styles.successBanner}>
                <Text style={styles.successIcon}>✅</Text>
                <View>
                  <Text style={styles.successTitle}>{result.added} items added to pantry!</Text>
                  <Text style={styles.successSub}>Expiry dates estimated automatically</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Added to your pantry:</Text>
              {result.items.map((item: any, i: number) => {
                const daysLeft = item.expiryDate
                  ? Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;
                return (
                  <View key={i} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.itemName}</Text>
                      <Text style={styles.itemMeta}>
                        {item.quantityG > 0 ? `${item.quantityG}${item.unit}` : ''}
                        {daysLeft !== null ? ` · expires in ${daysLeft} days` : ''}
                      </Text>
                    </View>
                    <View style={[styles.freshDot, {
                      backgroundColor: item.freshnessScore > 70 ? COLORS.success : COLORS.warning
                    }]} />
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.emptyResult}>
              <Text style={styles.emptyIcon}>🤔</Text>
              <Text style={styles.emptyTitle}>No food items found</Text>
              <Text style={styles.emptySub}>Make sure the receipt is clear and fully visible, then try again.</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.retakeBtn} onPress={() => setResult(null)}>
              <Text style={styles.retakeBtnText}>Scan Another</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  guideContainer: { flex: 1, alignItems: 'center', justifyContent: 'space-between', padding: SPACING.xl, paddingTop: 60 },
  guideHeader: { alignItems: 'center' },
  guideTitle: { color: '#fff', fontSize: FONTS.sizes.xl, fontWeight: '800', marginBottom: 4 },
  guideSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: FONTS.sizes.sm },
  guideBox: { width: '85%', height: 340, borderWidth: 2, borderColor: '#fff', borderRadius: RADIUS.md, borderStyle: 'dashed' },
  guideTip: { color: 'rgba(255,255,255,0.7)', fontSize: FONTS.sizes.xs, textAlign: 'center' },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.xl, paddingBottom: 50, backgroundColor: 'rgba(0,0,0,0.5)' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: '#fff', fontSize: 20 },
  snapBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  snapBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary },
  analyzingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  analyzingText: { color: '#fff', marginTop: SPACING.md, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  analyzingSubText: { color: 'rgba(255,255,255,0.7)', marginTop: 4, fontSize: FONTS.sizes.sm },
  resultContainer: { flex: 1, backgroundColor: COLORS.background },
  successBanner: { backgroundColor: '#14532D', borderRadius: RADIUS.lg, padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  successIcon: { fontSize: 36 },
  successTitle: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: '#86EFAC' },
  successSub: { fontSize: FONTS.sizes.sm, color: '#4ADE80', marginTop: 2 },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  itemInfo: { flex: 1 },
  itemName: { fontSize: FONTS.sizes.base, fontWeight: '600', color: COLORS.textPrimary },
  itemMeta: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  freshDot: { width: 10, height: 10, borderRadius: 5 },
  emptyResult: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.lg },
  emptySub: { fontSize: FONTS.sizes.base, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xl },
  retakeBtn: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  retakeBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  doneBtn: { flex: 2, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontWeight: '800', fontSize: FONTS.sizes.base },
  permissionScreen: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  permissionText: { color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.lg },
  permissionBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md, paddingHorizontal: SPACING.xl },
  permissionBtnText: { color: '#fff', fontWeight: '700' },
});
