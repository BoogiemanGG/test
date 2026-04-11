/**
 * aiCoach.ts
 * Gemini-powered AI coach — handles voice Q&A, craving translator,
 * dining out advice, personalized coaching
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const prisma = new PrismaClient();

interface CoachInput {
  userId: string;
  message: string;
  context?: {
    location?: string;
    currentTime?: string;
    mealType?: string;
  };
}

const SYSTEM_PROMPT = `You are a friendly, knowledgeable personal nutrition and wellness coach
inside the HealthLifeHub app. You have full awareness of the user's daily food log,
their chosen diet plan, calorie goals, exercise history, and pantry inventory.

Your personality:
- Warm, encouraging, never judgmental
- Brief and actionable (2-4 sentences max per response)
- Practical — you suggest real foods the user actually has
- Science-based but uses plain language

Rules:
- NEVER say "treat", "cure", "prescribe", or "diagnose"
- Always frame advice as "general wellness" information
- If asked medical questions, say "Please check with your doctor for that — I focus on everyday food and lifestyle."
- When suggesting food, prioritize what's in the user's pantry
- When the user mentions a craving, use the "Craving Translator": find a healthier swap that satisfies the same texture/flavor need
- Disclaimer line (add at end when giving nutrition advice): "General wellness info only — not medical advice."`;

export async function askAICoach({ userId, message, context }: CoachInput): Promise<string> {
  const userContext = await buildUserContext(userId);

  const contextStr = context
    ? `Current context: location=${context.location || 'unknown'}, time=${context.currentTime || new Date().toLocaleTimeString()}, meal=${context.mealType || 'unspecified'}`
    : '';

  const prompt = `${SYSTEM_PROMPT}

${contextStr}

User's data:
- Diet plan: ${userContext.dietPlan}
- Daily calorie target: ${userContext.calorieTarget} kcal
- Eaten today: ${userContext.eatenToday} kcal (${userContext.remainingCalories} remaining)
- Burned today: ${userContext.burnedToday} kcal
- Protein today: ${userContext.proteinToday}g (target: ${userContext.proteinTarget}g)
- Pantry items available: ${userContext.pantryItems.join(', ') || 'none scanned'}
- Meals logged today: ${userContext.mealsToday.join(', ') || 'none yet'}

User asks: "${message}"`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text() || 'I could not process that. Please try again.';
  } catch {
    return 'I could not process that right now. Please try again in a moment.';
  }
}

async function buildUserContext(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [profile, diaryEntries, exerciseEntries, pantryItems] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.diaryEntry.findMany({
      where: { userId, loggedAt: { gte: today, lt: tomorrow } },
      include: { food: true, recipe: true },
    }),
    prisma.exerciseEntry.findMany({
      where: { userId, loggedAt: { gte: today, lt: tomorrow } },
    }),
    prisma.pantryItem.findMany({
      where: { userId, usedAt: null },
      take: 20,
      orderBy: { expiryDate: 'asc' },
    }),
  ]);

  const eatenToday = Math.round(diaryEntries.reduce((sum, e) => sum + e.calories, 0));
  const burnedToday = Math.round(exerciseEntries.reduce((sum, e) => sum + e.caloriesBurned, 0));
  const calorieTarget = profile?.calorieTarget || 2000;
  const proteinToday = Math.round(diaryEntries.reduce((sum, e) => sum + e.proteinG, 0));
  const proteinTarget = Math.round((calorieTarget * 0.25) / 4);

  const mealsToday = diaryEntries.map(e =>
    e.food?.name || e.recipe?.title || 'unknown food'
  );

  return {
    dietPlan: profile?.dietPlan || 'mediterranean',
    calorieTarget,
    eatenToday,
    burnedToday,
    remainingCalories: Math.max(0, calorieTarget - eatenToday + burnedToday),
    proteinToday,
    proteinTarget,
    pantryItems: pantryItems.map(p => p.itemName),
    mealsToday,
  };
}

export async function translateCraving(userId: string, craving: string): Promise<string> {
  const context = await buildUserContext(userId);
  const prompt = `${SYSTEM_PROMPT}

The user craves: "${craving}"
Their pantry has: ${context.pantryItems.join(', ') || 'nothing scanned yet'}
Their diet plan: ${context.dietPlan}
Remaining calories: ${context.remainingCalories}

Give ONE healthy swap that satisfies the same flavor/texture need, preferably using pantry items.
Be specific: name the item, how to prepare it simply, and its approximate calories.
Keep it to 2 sentences.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text() || 'Try a handful of nuts or fruit for that craving!';
  } catch {
    return 'Try a handful of nuts or fruit for that craving!';
  }
}
