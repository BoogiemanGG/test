/**
 * CalorieRing — Animated circular progress ring showing daily calorie status
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { useTranslation } from '../hooks/useTranslation';

interface CalorieRingProps {
  eaten: number;
  target: number;
  burned: number;
}

const SIZE = 200;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function CalorieRing({ eaten, target, burned }: CalorieRingProps) {
  const { t } = useTranslation();
  const animValue = useRef(new Animated.Value(0)).current;
  const net = eaten - burned;
  const progress = Math.min(1, Math.max(0, net / target));
  const remaining = Math.max(0, target - net);
  const isOverGoal = net > target;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const ringColor = isOverGoal ? COLORS.error : progress > 0.85 ? COLORS.warning : COLORS.primary;

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Background ring */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={COLORS.calorieRingBg}
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Progress ring — animated via strokeDashoffset workaround */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={ringColor}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        {/* Burn ring (outer, thinner) */}
        {burned > 0 && (
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R + STROKE}
            stroke={COLORS.burnRing}
            strokeWidth={6}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(1, burned / target))}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            opacity={0.7}
          />
        )}
      </Svg>

      {/* Center text */}
      <View style={styles.center}>
        <Text style={[styles.mainNumber, isOverGoal && styles.overGoal]}>{isOverGoal ? '+' + (net - target) : remaining}</Text>
        <Text style={styles.mainLabel}>{t(isOverGoal ? 'ring.overGoal' : 'ring.remaining')}</Text>
        {burned > 0 && (
          <Text style={styles.burnLabel}>🔥 {burned} {t('ring.burned')}</Text>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <LegendItem color={COLORS.primary} label={t('ring.eaten')} value={`${eaten} kcal`} />
        <LegendItem color={COLORS.burnRing} label={t('ring.burned')} value={`${burned} kcal`} />
        <LegendItem color={COLORS.textMuted} label={t('ring.goal')} value={`${target} kcal`} />
      </View>
    </View>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: SPACING.md },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 60, alignItems: 'center', justifyContent: 'center' },
  mainNumber: { fontSize: FONTS.sizes.xxxl, fontWeight: '900', color: COLORS.textPrimary },
  overGoal: { color: COLORS.error },
  mainLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 2 },
  burnLabel: { fontSize: FONTS.sizes.xs, color: COLORS.burnRing, marginTop: 4 },
  legend: { flexDirection: 'row', gap: SPACING.base, marginTop: SPACING.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  legendValue: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '600' },
});
