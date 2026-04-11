/**
 * foodRecognition.ts
 * Gemini Vision — analyzes food/fridge photos in a single API call.
 * Replaces the old Google Vision API + Edamam two-step approach.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const prisma = new PrismaClient();

interface FoodAnalysisResult {
  detectedItems: DetectedItem[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  plateScoreOut100: number;
  dietCompatibility: DietScores;
  suggestions: string[];
}

interface DetectedItem {
  name: string;
  confidence: number;
  estimatedWeightG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sodiumMg: number;
}

interface DietScores {
  dash: number;
  mediterranean: number;
  flexitarian: number;
}

interface FridgeItem {
  name: string;
  estimatedWeightG: number;
  unit: string;
  freshnessScore: number;
  estimatedExpiry: string | null;
}

// Analyze a plate photo → return calories + macros + plate score
export async function analyzePhoto(imageBuffer: Buffer, userId: string): Promise<FoodAnalysisResult> {
  const base64 = imageBuffer.toString('base64');
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Analyze this food photo and identify all visible food items with their nutrition.
Return ONLY a valid JSON object in this exact format, no extra text:
{
  "items": [
    {
      "name": "food name",
      "estimatedWeightG": 150,
      "calories": 250,
      "proteinG": 12,
      "carbsG": 30,
      "fatG": 8,
      "sodiumMg": 200
    }
  ]
}
Identify up to 5 food items. Estimate realistic portion weights. Use standard nutrition values per estimated weight.`;

  let detectedItems: DetectedItem[] = [];

  try {
    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType: 'image/jpeg' } },
      prompt,
    ]);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      detectedItems = (parsed.items || []).map((item: any) => ({
        name: String(item.name || 'Unknown food'),
        confidence: 0.85,
        estimatedWeightG: Number(item.estimatedWeightG) || 150,
        calories: Number(item.calories) || 0,
        proteinG: Number(item.proteinG) || 0,
        carbsG: Number(item.carbsG) || 0,
        fatG: Number(item.fatG) || 0,
        sodiumMg: Number(item.sodiumMg) || 0,
      }));
    }
  } catch {
    // Return empty result on failure
  }

  const totals = detectedItems.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      proteinG: acc.proteinG + item.proteinG,
      carbsG: acc.carbsG + item.carbsG,
      fatG: acc.fatG + item.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  const plateScore = calcPlateScore(totals);
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const dietScores = calcDietCompatibility(detectedItems, profile?.dietPlan || 'mediterranean');
  const suggestions = generateFoodSuggestions(totals, profile?.calorieTarget || 2000, profile?.dietPlan || 'mediterranean');

  return {
    detectedItems,
    totalCalories: Math.round(totals.calories),
    totalProteinG: Math.round(totals.proteinG),
    totalCarbsG: Math.round(totals.carbsG),
    totalFatG: Math.round(totals.fatG),
    plateScoreOut100: plateScore,
    dietCompatibility: dietScores,
    suggestions,
  };
}

// Analyze a fridge photo → return detected items for pantry
export async function scanFridgeInventory(imageBuffer: Buffer): Promise<FridgeItem[]> {
  const base64 = imageBuffer.toString('base64');
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Analyze this fridge/pantry photo and list all visible food items.
Return ONLY a valid JSON object in this exact format, no extra text:
{
  "items": [
    {
      "name": "item name",
      "estimatedWeightG": 200,
      "unit": "g",
      "freshnessScore": 85,
      "daysUntilExpiry": 7
    }
  ]
}
List up to 20 visible items. Use "ml" for liquids, "g" for solids.
freshnessScore is 0-100 (100 = very fresh). Estimate daysUntilExpiry realistically.`;

  try {
    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType: 'image/jpeg' } },
      prompt,
    ]);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return (parsed.items || []).map((item: any) => {
      const days = Number(item.daysUntilExpiry) || 14;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days);
      return {
        name: String(item.name || 'Unknown item'),
        estimatedWeightG: Number(item.estimatedWeightG) || 200,
        unit: String(item.unit || 'g'),
        freshnessScore: Number(item.freshnessScore) || 80,
        estimatedExpiry: expiry.toISOString(),
      };
    });
  } catch {
    return [];
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcPlateScore(totals: { calories: number; proteinG: number; carbsG: number; fatG: number }): number {
  if (totals.calories === 0) return 0;
  const proteinCal = totals.proteinG * 4;
  const carbsCal = totals.carbsG * 4;
  const fatCal = totals.fatG * 9;
  const total = proteinCal + carbsCal + fatCal;
  if (total === 0) return 0;

  const proteinPct = proteinCal / total;
  const carbsPct = carbsCal / total;
  const fatPct = fatCal / total;

  const proteinScore = Math.max(0, 100 - Math.abs(proteinPct - 0.25) * 400);
  const carbsScore = Math.max(0, 100 - Math.abs(carbsPct - 0.50) * 200);
  const fatScore = Math.max(0, 100 - Math.abs(fatPct - 0.25) * 400);

  return Math.round((proteinScore + carbsScore + fatScore) / 3);
}

function calcDietCompatibility(_items: DetectedItem[], _dietPlan: string): DietScores {
  return { dash: 70, mediterranean: 75, flexitarian: 65 };
}

function generateFoodSuggestions(
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number },
  calorieTarget: number,
  dietPlan: string
): string[] {
  const suggestions: string[] = [];
  const remaining = calorieTarget - totals.calories;

  if (remaining > 0) {
    suggestions.push(`You have ${Math.round(remaining)} calories remaining today.`);
  } else {
    suggestions.push(`You've reached your daily calorie goal.`);
  }

  if (totals.proteinG < 20) {
    suggestions.push(`This meal is low in protein. Consider adding eggs, chicken, or legumes.`);
  }

  if (dietPlan === 'dash' && totals.fatG > 20) {
    suggestions.push(`This meal has higher fat. DASH guidelines recommend lean proteins and low-fat options.`);
  }

  return suggestions;
}
