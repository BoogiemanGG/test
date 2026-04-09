/**
 * Report Screen — Weekly Food Personality Report
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONTS } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import { api } from '../../services/api';
import { useUserStore } from '../../store/userStore';

export default function ReportScreen() {
  const { t } = useTranslation();
  const { profile } = useUserStore();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReport(); }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/report/weekly');
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  if (!profile?.isPro) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.proGate}>
          <Text style={styles.proGateIcon}>📊</Text>
          <Text style={styles.proGateTitle}>{t('report.proRequired')}</Text>
          <Text style={styles.proGateSub}>{t('report.proRequiredSub')}</Text>
          <TouchableOpacity style={styles.upgradeBtn}>
            <Text style={styles.upgradeBtnText}>✨ {t('common.upgradePro')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) return <ActivityIndicator color={COLORS.primary} style={{ flex: 1 }} />;

  if (!report) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📈</Text>
          <Text style={styles.emptyText}>{t('report.notEnoughData')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const momentum = report.healthMomentumScore || 0;
  const momentumColor = momentum > 70 ? COLORS.success : momentum > 40 ? COLORS.warning : COLORS.error;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Personality Banner */}
        <View style={styles.personalityBanner}>
          <Text style={styles.personalityEmoji}>🧬</Text>
          <View>
            <Text style={styles.personalityLabel}>{t('report.thisWeekYouAre')}</Text>
            <Text style={styles.personalityName}>{report.personalityLabel || 'Wellness Explorer'}</Text>
          </View>
        </View>

        {/* Momentum Score */}
        <View style={styles.momentumCard}>
          <Text style={styles.momentumTitle}>{t('report.healthMomentum')}</Text>
          <View style={styles.momentumRow}>
            <Text style={[styles.momentumScore, { color: momentumColor }]}>{momentum}</Text>
            <Text style={styles.momentumMax}>/100</Text>
          </View>
          <View style={styles.momentumBar}>
            <View style={[styles.momentumFill, { width: `${momentum}%`, backgroundColor: momentumColor }]} />
          </View>
          <Text style={styles.momentumDesc}>
            {momentum > 70 ? t('report.momentumGood') : momentum > 40 ? t('report.momentumOk') : t('report.momentumImprove')}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="🎯" label={t('report.goalDays')} value={`${report.goalHitDays}/7`} color={COLORS.primary} />
          <StatCard icon="🥦" label={t('report.plantVariety')} value={`${report.plantVarietyCount} ${t('report.plants')}`} color={COLORS.mediterranean} />
          <StatCard icon="📊" label={t('report.dietAdherence')} value={`${Math.round(report.dietAdherencePct)}%`} color={COLORS.secondary} />
          <StatCard icon="🌿" label={t('report.organicPct')} value={`${Math.round(report.organicPct)}%`} color={COLORS.success} />
        </View>

        {/* Highlights */}
        <View style={styles.highlightsCard}>
          <Text style={styles.sectionTitle}>{t('report.weekHighlights')}</Text>
          {report.topFood && (
            <View style={styles.highlight}>
              <Text style={styles.highlightIcon}>⭐</Text>
              <View>
                <Text style={styles.highlightLabel}>{t('report.mostEaten')}</Text>
                <Text style={styles.highlightValue}>{report.topFood}</Text>
              </View>
            </View>
          )}
          {report.bestDay && (
            <View style={styles.highlight}>
              <Text style={styles.highlightIcon}>🏆</Text>
              <View>
                <Text style={styles.highlightLabel}>{t('report.bestDay')}</Text>
                <Text style={styles.highlightValue}>{report.bestDay}</Text>
              </View>
            </View>
          )}
          {report.weakestDay && (
            <View style={styles.highlight}>
              <Text style={styles.highlightIcon}>💪</Text>
              <View>
                <Text style={styles.highlightLabel}>{t('report.focusDay')}</Text>
                <Text style={styles.highlightValue}>{report.weakestDay}</Text>
              </View>
            </View>
          )}
        </View>

        {/* AI Insight */}
        {report.aiInsight && (
          <View style={styles.aiInsightCard}>
            <Text style={styles.aiInsightTitle}>🤖 {t('report.aiInsight')}</Text>
            <Text style={styles.aiInsightText}>{report.aiInsight}</Text>
          </View>
        )}

        {/* Average Calories */}
        <View style={styles.avgCalCard}>
          <Text style={styles.avgCalLabel}>{t('report.avgDailyCalories')}</Text>
          <Text style={styles.avgCalValue}>{Math.round(report.avgDailyCalories)}</Text>
          <Text style={styles.avgCalUnit}>{t('macros.kcalPerDay')}</Text>
        </View>

        <TouchableOpacity style={styles.historyBtn} onPress={() => {}}>
          <Text style={styles.historyBtnText}>{t('report.viewHistory')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statCardIcon}>{icon}</Text>
      <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.base, paddingBottom: 100 },
  personalityBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md,
  },
  personalityEmoji: { fontSize: 48 },
  personalityLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  personalityName: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.primary },
  momentumCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md },
  momentumTitle: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  momentumRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  momentumScore: { fontSize: FONTS.sizes.xxxl, fontWeight: '900' },
  momentumMax: { fontSize: FONTS.sizes.lg, color: COLORS.textMuted },
  momentumBar: { height: 8, backgroundColor: COLORS.surfaceLight, borderRadius: RADIUS.full, marginVertical: SPACING.sm, overflow: 'hidden' },
  momentumFill: { height: '100%', borderRadius: RADIUS.full },
  momentumDesc: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center' },
  statCardIcon: { fontSize: 28, marginBottom: SPACING.xs },
  statCardValue: { fontSize: FONTS.sizes.lg, fontWeight: '800' },
  statCardLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },
  highlightsCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  highlightIcon: { fontSize: 24 },
  highlightLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  highlightValue: { fontSize: FONTS.sizes.base, fontWeight: '600', color: COLORS.textPrimary },
  aiInsightCard: { backgroundColor: '#1E3A2F', borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  aiInsightTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.sm },
  aiInsightText: { fontSize: FONTS.sizes.base, color: COLORS.textSecondary, lineHeight: 22 },
  avgCalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, alignItems: 'center' },
  avgCalLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  avgCalValue: { fontSize: FONTS.sizes.xxxl, fontWeight: '900', color: COLORS.textPrimary },
  avgCalUnit: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  historyBtn: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  historyBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  proGate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  proGateIcon: { fontSize: 64, marginBottom: SPACING.xl },
  proGateTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  proGateSub: { fontSize: FONTS.sizes.base, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },
  upgradeBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.xl },
  upgradeBtnText: { color: '#fff', fontWeight: '800', fontSize: FONTS.sizes.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 60 },
  emptyText: { color: COLORS.textSecondary, marginTop: SPACING.md, textAlign: 'center' },
});
