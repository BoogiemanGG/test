/**
 * nutritionCalc.ts
 * Nutrition lookups, barcode scanning, food search, diary status
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function lookupBarcode(barcode: string) {
  // First check local cache
  const cached = await prisma.food.findUnique({ where: { barcode } });
  if (cached) return cached;

  // Try Open Food Facts (free, no API key needed)
  try {
    const res = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    if (res.data.status !== 1) return null;
    const p = res.data.product;
    const n = p.nutriments || {};

    const food = await prisma.food.create({
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
    return food;
  } catch {
    return null;
  }
}

export async function searchFoods(query: string, diet?: string) {
  // Search Edamam food database
  try {
    const res = await axios.get('https://api.edamam.com/api/food-database/v2/parser', {
      params: {
        app_id: process.env.EDAMAM_APP_ID,
        app_key: process.env.EDAMAM_APP_KEY,
        ingr: query,
        'nutrition-type': 'logging',
      },
    });

    let hints = res.data.hints?.slice(0, 20) || [];

    // Filter by diet compatibility if specified
    if (diet) {
      hints = hints.filter((h: any) => {
        const categories = h.food?.categoryLabel?.toLowerCase() || '';
        if (diet === 'vegan') return !categories.includes('meat') && !categories.includes('dairy');
        if (diet === 'dash') return (h.food?.nutrients?.NA || 0) < 300;
        return true;
      });
    }

    return hints.map((h: any) => ({
      id: h.food.foodId,
      name: h.food.label,
      brand: h.food.brand,
      calories100g: h.food.nutrients?.ENERC_KCAL || 0,
      protein100g: h.food.nutrients?.PROCNT || 0,
      carbs100g: h.food.nutrients?.CHOCDF || 0,
      fat100g: h.food.nutrients?.FAT || 0,
      imageUrl: h.food.image,
    }));
  } catch {
    // Fallback to local DB
    return prisma.food.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      take: 20,
    });
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
    message = `You have ${remaining} calories remaining. Keep going—you're well under your goal.`;
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
