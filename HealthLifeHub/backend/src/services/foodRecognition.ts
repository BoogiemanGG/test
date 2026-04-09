/**
 * foodRecognition.ts
 * Sends food/fridge photos to Google Vision API + Edamam for nutrition analysis
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FoodAnalysisResult {
  detectedItems: DetectedItem[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  plateScoreOut100: number;     // Plate Architecture Score
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

  // Step 1: Google Vision — detect food items
  const visionResponse = await axios.post(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
    {
      requests: [{
        image: { content: base64 },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 20 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
        ],
      }],
    }
  );

  const labels: string[] = visionResponse.data.responses[0]?.labelAnnotations
    ?.filter((l: any) => l.score > 0.7)
    .map((l: any) => l.description) || [];

  const foodLabels = labels.filter(l => isFoodLabel(l));

  // Step 2: Edamam — get nutrition for detected foods
  const detectedItems: DetectedItem[] = [];
  for (const label of foodLabels.slice(0, 5)) {
    try {
      const nutrition = await getEdamamNutrition(label, 150); // estimate 150g per item
      detectedItems.push(nutrition);
    } catch {
      // skip items not found in nutrition DB
    }
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

  // Step 3: Calculate Plate Architecture Score
  const plateScore = calcPlateScore(totals);

  // Step 4: Get user diet plan for compatibility scores
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const dietScores = calcDietCompatibility(detectedItems, profile?.dietPlan || 'mediterranean');

  // Step 5: Generate suggestions
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

  const visionResponse = await axios.post(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
    {
      requests: [{
        image: { content: base64 },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 30 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 20 },
        ],
      }],
    }
  );

  const labels: string[] = visionResponse.data.responses[0]?.labelAnnotations
    ?.filter((l: any) => l.score > 0.65)
    .map((l: any) => l.description) || [];

  const foodLabels = labels.filter(l => isFoodLabel(l));

  return foodLabels.map(label => ({
    name: label,
    estimatedWeightG: estimateDefaultWeight(label),
    unit: estimateUnit(label),
    freshnessScore: 90,
    estimatedExpiry: estimateExpiry(label),
  }));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getEdamamNutrition(food: string, weightG: number): Promise<DetectedItem> {
  const res = await axios.get('https://api.edamam.com/api/nutrition-data', {
    params: {
      app_id: process.env.EDAMAM_APP_ID,
      app_key: process.env.EDAMAM_APP_KEY,
      ingr: `${weightG}g ${food}`,
    },
  });
  const d = res.data;
  return {
    name: food,
    confidence: 0.8,
    estimatedWeightG: weightG,
    calories: d.calories || 0,
    proteinG: d.totalNutrients?.PROCNT?.quantity || 0,
    carbsG: d.totalNutrients?.CHOCDF?.quantity || 0,
    fatG: d.totalNutrients?.FAT?.quantity || 0,
    sodiumMg: d.totalNutrients?.NA?.quantity || 0,
  };
}

function isFoodLabel(label: string): boolean {
  const foodKeywords = ['food', 'dish', 'meal', 'fruit', 'vegetable', 'meat', 'chicken',
    'fish', 'rice', 'bread', 'pasta', 'salad', 'soup', 'egg', 'cheese', 'milk',
    'apple', 'banana', 'tomato', 'lettuce', 'carrot', 'broccoli', 'potato', 'onion'];
  return foodKeywords.some(k => label.toLowerCase().includes(k));
}

function calcPlateScore(totals: { calories: number; proteinG: number; carbsG: number; fatG: number }): number {
  // Ideal: 50% carbs, 25% protein, 25% fat by calories
  if (totals.calories === 0) return 0;
  const proteinCal = totals.proteinG * 4;
  const carbsCal = totals.carbsG * 4;
  const fatCal = totals.fatG * 9;
  const total = proteinCal + carbsCal + fatCal;

  const proteinPct = proteinCal / total;
  const carbsPct = carbsCal / total;
  const fatPct = fatCal / total;

  const proteinScore = Math.max(0, 100 - Math.abs(proteinPct - 0.25) * 400);
  const carbsScore = Math.max(0, 100 - Math.abs(carbsPct - 0.50) * 200);
  const fatScore = Math.max(0, 100 - Math.abs(fatPct - 0.25) * 400);

  return Math.round((proteinScore + carbsScore + fatScore) / 3);
}

function calcDietCompatibility(_items: DetectedItem[], _dietPlan: string): DietScores {
  // Simplified scoring — in production this would be more sophisticated
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

function estimateDefaultWeight(food: string): number {
  const weights: Record<string, number> = {
    apple: 182, banana: 120, egg: 60, chicken: 300, milk: 500,
    bread: 400, cheese: 200, tomato: 150, default: 200,
  };
  const key = Object.keys(weights).find(k => food.toLowerCase().includes(k));
  return key ? weights[key] : weights.default;
}

function estimateUnit(food: string): string {
  const liquids = ['milk', 'juice', 'yogurt', 'cream'];
  if (liquids.some(l => food.toLowerCase().includes(l))) return 'ml';
  return 'g';
}

function estimateExpiry(food: string): string | null {
  const daysToExpiry: Record<string, number> = {
    milk: 7, egg: 21, chicken: 3, fish: 2, spinach: 5, lettuce: 7,
    apple: 30, banana: 7, cheese: 14, default: 14,
  };
  const key = Object.keys(daysToExpiry).find(k => food.toLowerCase().includes(k));
  const days = key ? daysToExpiry[key] : daysToExpiry.default;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry.toISOString();
}
