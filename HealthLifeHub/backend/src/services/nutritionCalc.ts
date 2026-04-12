/**
 * nutritionCalc.ts
 * Nutrition lookups, barcode scanning (Open Food Facts), food search (Gemini),
 * and diary status. Uses native fetch — no axios dependency needed.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const prisma = new PrismaClient();

export async function lookupBarcode(barcode: string) {
  // Check local cache first
  const cached = await prisma.food.findUnique({ where: { barcode } });
  if (cached) return cached;

  // Open Food Facts — completely free, no API key needed
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json() as any;
    if (data.status !== 1) return null;

    const p = data.product;
    const n = p.nutriments || {};

    return await prisma.food.create({
      data: {
        externalId: `off_${barcode}`,
        barcode,
        name: p.product_name || 'Unknown Product',
        brand: p.brands || null,
        calories100g: n['energy-kcal_100g'] || 0,
        protein100g: n['proteins_100g'] || 0,
        carbs100g: n['carbohydrates_100g'] || 0,
        fat100g: n['fat_100g'] || 0,
        fiber100g: n['fiber_100g'] || 0,
        sugar100g: n['sugars_100g'] || 0,
        sodium100mg: (n['sodium_100g'] || 0) * 1000,
        imageUrl: p.image_url || null,
      },
    });
  } catch {
    return null;
  }
}

export async function searchFoods(query: string, diet?: string) {
  // Try local DB first (SQLite: no mode:'insensitive' — use plain contains)
  const local = await prisma.food.findMany({
    where: { name: { contains: query } },
    take: 20,
  });
  if (local.length >= 3) return local;

  // Use Gemini to look up nutrition for unknown foods
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const dietNote = diet ? ` Prefer ${diet}-diet-friendly options.` : '';
    const prompt = `Provide accurate nutrition facts per 100g for "${query}".${dietNote}
Return ONLY a JSON array, no extra text:
[
  {
    "name": "exact food name",
    "calories100g": 150,
    "protein100g": 5.2,
    "carbs100g": 20.1,
    "fat100g": 3.4,
    "fiber100g": 2.1,
    "sugar100g": 8.0,
    "sodium100mg": 50
  }
]
List up to 5 common variations or preparations. All values per 100g.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return local;

    const items = JSON.parse(jsonMatch[0]);
    return items.map((item: any, i: number) => ({
      id: `gemini_${i}_${Date.now()}`,
      name: String(item.name || query),
      brand: null,
      barcode: null,
      externalId: null,
      calories100g: Number(item.calories100g) || 0,
      protein100g: Number(item.protein100g) || 0,
      carbs100g: Number(item.carbs100g) || 0,
      fat100g: Number(item.fat100g) || 0,
      fiber100g: Number(item.fiber100g) || 0,
      sugar100g: Number(item.sugar100g) || 0,
      sodium100mg: Number(item.sodium100mg) || 0,
      imageUrl: null,
      isOrganic: false,
    }));
  } catch {
    return local;
  }
}

export async function getDiaryStatus(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [entries, profile, exerciseToday] = await Promise.all([
    prisma.diaryEntry.findMany({
      where: { userId, loggedAt: { gte: today, lt: tomorrow } },
    }),
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.exerciseEntry.findMany({
      where: { userId, loggedAt: { gte: today, lt: tomorrow } },
    }),
  ]);

  const totalEaten = Math.round(entries.reduce((sum, e) => sum + e.calories, 0));
  const totalBurned = Math.round(exerciseToday.reduce((sum, e) => sum + e.caloriesBurned, 0));
  const calorieTarget = profile?.calorieTarget || 2000;
  const netCalories = totalEaten - totalBurned;
  const remaining = calorieTarget - netCalories;

  const proteinEaten = Math.round(entries.reduce((sum, e) => sum + e.proteinG, 0));
  const proteinTarget = Math.round((calorieTarget * 0.25) / 4);

  let message = '';
  if (remaining > 500) {
    message = `You have ${remaining} calories remaining. Keep going — you're well under your goal.`;
  } else if (remaining > 0) {
    message = `Almost there! You have ${remaining} calories left for today.`;
  } else {
    message = `You've hit your calorie goal for today. Great work!`;
  }
  if (totalBurned > 0) {
    message += ` You burned ${totalBurned} cal through exercise today.`;
  }

  return {
    totalEaten,
    totalBurned,
    netCalories,
    calorieTarget,
    remaining: Math.max(0, remaining),
    proteinEaten,
    proteinTarget,
    proteinGoalMet: proteinEaten >= proteinTarget,
    message,
  };
}
