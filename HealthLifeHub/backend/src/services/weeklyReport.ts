/**
 * weeklyReport.ts
 * Generates the Weekly Food Personality report using diary + exercise data + Claude AI
 */
import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const prisma = new PrismaClient();

const PERSONALITY_LABELS = [
  'Protein Powerhouse', 'Carbivore', 'Plant Lover', 'Mediterranean Soul',
  'Balanced Champion', 'Sweet Tooth Tamer', 'Mindful Snacker', 'Lean Machine',
  'Veggie Explorer', 'Calorie Cruncher',
];

export async function generateWeeklyReport(userId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [entries, exercises, profile] = await Promise.all([
    prisma.diaryEntry.findMany({
      where: { userId, loggedAt: { gte: weekStart, lt: weekEnd } },
      include: { food: true, recipe: true },
    }),
    prisma.exerciseEntry.findMany({
      where: { userId, loggedAt: { gte: weekStart, lt: weekEnd } },
    }),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);

  if (entries.length === 0) {
    return prisma.weeklyReport.create({
      data: {
        userId,
        weekStart,
        aiInsight: 'No food logged this week. Start snapping your meals to get your first report!',
        personalityLabel: 'New Explorer',
      },
    });
  }

  // Group by day of week
  const byDay = groupByDay(entries, weekStart);
  const dailyCalories = byDay.map(day => day.reduce((sum, e) => sum + e.calories, 0));

  const avgDailyCalories = dailyCalories.reduce((a, b) => a + b, 0) / 7;
  const calorieTarget = profile?.calorieTarget || 2000;
  const goalHitDays = dailyCalories.filter(c => c > 0 && Math.abs(c - calorieTarget) < 200).length;

  // Most eaten food
  const foodCounts: Record<string, number> = {};
  entries.forEach(e => {
    const name = e.food?.name || e.recipe?.title || 'unknown';
    foodCounts[name] = (foodCounts[name] || 0) + 1;
  });
  const topFood = Object.entries(foodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Best and weakest day
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const nonZeroDays = dailyCalories.map((cal, i) => ({ day: dayNames[i], cal })).filter(d => d.cal > 0);
  const bestDay = nonZeroDays.sort((a, b) => Math.abs(a.cal - calorieTarget) - Math.abs(b.cal - calorieTarget))[0]?.day || null;
  const weakestDay = nonZeroDays.sort((a, b) => Math.abs(b.cal - calorieTarget) - Math.abs(a.cal - calorieTarget))[0]?.day || null;

  // Unique plants
  const plants = new Set<string>();
  entries.forEach(e => {
    if (e.food && isPlantBased(e.food.name)) plants.add(e.food.name.toLowerCase());
  });

  // Diet adherence
  const dietAdherence = calcDietAdherence(entries, profile?.dietPlan || 'mediterranean');

  // Organic %
  const organicEntries = entries.filter(e => e.food?.isOrganic);
  const organicPct = entries.length > 0 ? (organicEntries.length / entries.length) * 100 : 0;

  // Health Momentum Score (0-100)
  const momentumScore = calcMomentumScore({ goalHitDays, dietAdherence, plantVariety: plants.size, exercises });

  // Personality label
  const personalityLabel = assignPersonality(entries, profile?.dietPlan || 'mediterranean');

  // AI-generated insight
  const aiInsight = await generateAIInsight({
    avgDailyCalories: Math.round(avgDailyCalories),
    calorieTarget,
    goalHitDays,
    topFood,
    bestDay,
    weakestDay,
    momentumScore,
    dietPlan: profile?.dietPlan || 'mediterranean',
    personalityLabel,
    exerciseCount: exercises.length,
  });

  return prisma.weeklyReport.create({
    data: {
      userId,
      weekStart,
      avgDailyCalories: Math.round(avgDailyCalories),
      goalHitDays,
      topFood,
      weakestDay,
      bestDay,
      healthMomentumScore: momentumScore,
      dietAdherencePct: dietAdherence,
      plantVarietyCount: plants.size,
      organicPct: Math.round(organicPct),
      personalityLabel,
      aiInsight,
    },
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupByDay(entries: any[], weekStart: Date): any[][] {
  const days: any[][] = Array.from({ length: 7 }, () => []);
  entries.forEach(entry => {
    const dayIndex = Math.floor(
      (entry.loggedAt.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (dayIndex >= 0 && dayIndex < 7) days[dayIndex].push(entry);
  });
  return days;
}

function isPlantBased(name: string): boolean {
  const plantKeywords = ['vegetable', 'fruit', 'grain', 'legume', 'bean', 'lentil', 'nut',
    'seed', 'salad', 'spinach', 'kale', 'broccoli', 'carrot', 'tomato', 'potato',
    'apple', 'banana', 'berry', 'rice', 'oat', 'quinoa', 'tofu', 'tempeh'];
  return plantKeywords.some(k => name.toLowerCase().includes(k));
}

function calcDietAdherence(entries: any[], dietPlan: string): number {
  if (entries.length === 0) return 0;
  let compliant = 0;
  entries.forEach(e => {
    if (!e.food) { compliant++; return; }
    if (dietPlan === 'dash' && e.food.sodiumMg < 400) compliant++;
    else if (dietPlan === 'mediterranean' && e.food.fat100g > 0) compliant++;
    else if (dietPlan === 'flexitarian' && e.food.fiber100g > 2) compliant++;
    else compliant++;
  });
  return Math.round((compliant / entries.length) * 100);
}

function calcMomentumScore(data: {
  goalHitDays: number;
  dietAdherence: number;
  plantVariety: number;
  exercises: any[];
}): number {
  const goalScore = (data.goalHitDays / 7) * 30;
  const dietScore = (data.dietAdherence / 100) * 30;
  const plantScore = Math.min(30, data.plantVariety * 2);
  const exerciseScore = Math.min(10, data.exercises.length * 2);
  return Math.round(goalScore + dietScore + plantScore + exerciseScore);
}

function assignPersonality(entries: any[], dietPlan: string): string {
  const avgProtein = entries.reduce((sum, e) => sum + (e.proteinG || 0), 0) / Math.max(entries.length, 1);
  const avgCarbs = entries.reduce((sum, e) => sum + (e.carbsG || 0), 0) / Math.max(entries.length, 1);
  const avgFiber = entries.reduce((sum, e) => sum + (e.fiberG || 0), 0) / Math.max(entries.length, 1);

  if (avgProtein > 30) return 'Protein Powerhouse';
  if (avgCarbs > 50) return 'Carbivore';
  if (avgFiber > 8) return 'Plant Lover';
  if (dietPlan === 'mediterranean') return 'Mediterranean Soul';
  return PERSONALITY_LABELS[Math.floor(Math.random() * PERSONALITY_LABELS.length)];
}

async function generateAIInsight(data: {
  avgDailyCalories: number;
  calorieTarget: number;
  goalHitDays: number;
  topFood: string | null;
  bestDay: string | null;
  weakestDay: string | null;
  momentumScore: number;
  dietPlan: string;
  personalityLabel: string;
  exerciseCount: number;
}): Promise<string> {
  const prompt = `
Write a warm, personal 3-sentence weekly health summary for a user with these stats:
- Average daily calories: ${data.avgDailyCalories} (target: ${data.calorieTarget})
- Hit calorie goal: ${data.goalHitDays}/7 days
- Most eaten food: ${data.topFood}
- Best day: ${data.bestDay}, hardest day: ${data.weakestDay}
- Health Momentum Score: ${data.momentumScore}/100
- Diet plan: ${data.dietPlan}
- Personality type this week: "${data.personalityLabel}"
- Exercise sessions: ${data.exerciseCount}

Be encouraging, specific, and end with ONE actionable tip for next week. General wellness only — not medical advice.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  } catch {
    return `Great effort this week! You hit your goal ${data.goalHitDays} out of 7 days. Keep building on your "${data.personalityLabel}" style and aim for one more plant-based meal next week.`;
  }
}
