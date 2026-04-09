import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit?: string;
}

export function MacroBar({ label, current, target, color, unit = 'g' }: MacroBarProps) {
  const animWidth = useRef(new Animated.Value(0)).current;
  const progress = target > 0 ? Math.min(1, current / target) : 0;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const isOver = current > target;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, isOver && { color: COLORS.warning }]}>
          {Math.round(current)}{unit} / {target}{unit}
        </Text>
      </View>
      <View style={styles.barBg}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: isOver ? COLORS.warning : color,
              width: animWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  value: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  barBg: { height: 6, backgroundColor: COLORS.surfaceLight, borderRadius: RADIUS.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: RADIUS.full },
});
