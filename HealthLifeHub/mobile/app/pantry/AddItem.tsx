import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { usePantryStore } from '../../store/pantryStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

const UNITS = ['g', 'ml', 'piece', 'cup', 'tbsp', 'tsp', 'oz', 'lb'];

export default function AddItemScreen() {
  const { addItem } = usePantryStore();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('g');
  const [daysUntilExpiry, setDaysUntilExpiry] = useState('7');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter the item name.');
      return;
    }
    setSaving(true);
    try {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + (parseInt(daysUntilExpiry) || 7));
      await addItem({
        itemName: name.trim(),
        quantityG: parseFloat(quantity) || 100,
        unit,
        expiryDate: expiry.toISOString(),
        freshnessScore: 90,
      });
      Alert.alert('Added!', `${name} added to your pantry.`, [
        { text: 'Add another', onPress: () => { setName(''); setQuantity('100'); setDaysUntilExpiry('7'); } },
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not add item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Pantry Item</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <Text style={styles.label}>Item Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Chicken breast, Milk, Apples..."
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text style={styles.label}>Quantity</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="100"
              placeholderTextColor={COLORS.textMuted}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
            <View style={styles.unitRow}>
              {UNITS.map(u => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.label}>Days until expiry</Text>
          <View style={styles.daysRow}>
            {['3', '7', '14', '30', '90'].map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.dayBtn, daysUntilExpiry === d && styles.dayBtnActive]}
                onPress={() => setDaysUntilExpiry(d)}
              >
                <Text style={[styles.dayBtnText, daysUntilExpiry === d && styles.dayBtnTextActive]}>
                  {d}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Or type custom days..."
            placeholderTextColor={COLORS.textMuted}
            value={daysUntilExpiry}
            onChangeText={setDaysUntilExpiry}
            keyboardType="numeric"
          />

          <View style={styles.preview}>
            <Text style={styles.previewTitle}>Preview</Text>
            <Text style={styles.previewText}>
              {name || 'Item name'} · {quantity}{unit} · expires in {daysUntilExpiry} days
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Adding...' : 'Add to Pantry'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.base },
  backBtn: { padding: SPACING.sm },
  backText: { color: COLORS.primary, fontSize: FONTS.sizes.base },
  title: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { padding: SPACING.base, paddingBottom: 60 },
  label: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.md },
  input: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.base,
  },
  row: { gap: SPACING.sm },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.xs },
  unitBtn: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'transparent',
  },
  unitBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  unitBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  unitBtnTextActive: { color: '#fff' },
  daysRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  dayBtn: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm, alignItems: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  dayBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  dayBtnTextActive: { color: '#fff' },
  preview: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.lg, borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  previewTitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '600', marginBottom: 4 },
  previewText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.base },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.xl,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.md },
});
