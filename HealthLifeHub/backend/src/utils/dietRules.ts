/**
 * dietRules.ts
 * Complete diet plan definitions, rules, food scoring, and recipe categorization
 * All 3 main diet plans: DASH, Mediterranean, Flexitarian
 */

export interface DietPlan {
  id: string;
  name: string;
  tagline: string;
  description: string;
  whyDoctorsRecommend: string;
  whoIsItFor: string;
  calorieRange: { min: number; max: number };
  macroTargets: {
    proteinPct: number;
    carbsPct: number;
    fatPct: number;
  };
  keyNutrients: string[];
  limitedFoods: string[];
  encouragedFoods: string[];
  sodiumLimitMg: number;
  legalDisclaimer: string;
  color: string;
  icon: string;
}

export const DIET_PLANS: Record<string, DietPlan> = {
  dash: {
    id: 'dash',
    name: 'DASH',
    tagline: 'Heart Guardian',
    description:
      'DASH (Dietary Approaches to Stop Hypertension) is a clinically-researched eating plan developed by the NIH. It focuses on reducing sodium while increasing potassium, magnesium, and calcium-rich foods to support healthy blood pressure.',
    whyDoctorsRecommend:
      'Consistently ranked #1 for heart health by medical experts. Proven to reduce blood pressure as effectively as some medications, lower LDL cholesterol, and reduce risk of stroke and heart disease.',
    whoIsItFor:
      'Adults with high blood pressure, those concerned about heart health, people over 50, or anyone wanting a clinically-backed balanced eating plan.',
    calorieRange: { min: 1600, max: 2400 },
    macroTargets: { proteinPct: 18, carbsPct: 55, fatPct: 27 },
    keyNutrients: ['Potassium', 'Magnesium', 'Calcium', 'Fiber'],
    limitedFoods: ['Salt', 'Red meat', 'Full-fat dairy', 'Sugary drinks', 'Processed foods'],
    encouragedFoods: [
      'Fruits', 'Vegetables', 'Whole grains', 'Low-fat dairy',
      'Lean proteins (chicken, fish)', 'Nuts', 'Legumes',
    ],
    sodiumLimitMg: 2300,
    legalDisclaimer:
      'Based on NIH DASH Study guidelines. For educational wellness purposes only. Consult your healthcare provider for personalized medical advice.',
    color: '#2D9CDB',
    icon: '❤️',
  },

  mediterranean: {
    id: 'mediterranean',
    name: 'Mediterranean',
    tagline: 'Longevity Secret',
    description:
      'The Mediterranean diet is based on the traditional eating habits of countries bordering the Mediterranean Sea. It emphasizes whole, minimally processed foods, healthy fats (especially olive oil), and social enjoyment of meals.',
    whyDoctorsRecommend:
      'Consistently ranked #1 overall health diet. Strong evidence for reducing risk of heart disease, type 2 diabetes, Alzheimer\'s disease, and certain cancers. Associated with longer lifespan and better brain health.',
    whoIsItFor:
      'Anyone focused on long-term brain health, inflammation reduction, longevity, or simply wanting a delicious, sustainable eating plan without strict restrictions.',
    calorieRange: { min: 1500, max: 2500 },
    macroTargets: { proteinPct: 15, carbsPct: 50, fatPct: 35 },
    keyNutrients: ['Omega-3 fatty acids', 'Antioxidants', 'Polyphenols', 'Fiber'],
    limitedFoods: ['Processed foods', 'Red meat (occasional)', 'Added sugars', 'Refined grains', 'Butter'],
    encouragedFoods: [
      'Extra virgin olive oil', 'Fish & seafood', 'Vegetables', 'Fruits',
      'Whole grains', 'Legumes', 'Nuts', 'Herbs & spices',
      'Moderate red wine (optional)',
    ],
    sodiumLimitMg: 2800,
    legalDisclaimer:
      'Based on established Mediterranean dietary patterns supported by peer-reviewed research. For general wellness information only.',
    color: '#27AE60',
    icon: '🫒',
  },

  flexitarian: {
    id: 'flexitarian',
    name: 'Flexitarian',
    tagline: 'Weight Loss Architect',
    description:
      'The Flexitarian diet was created by registered dietitian Dawn Jackson Blatner. It combines the proven health benefits of plant-based eating with the flexibility to occasionally enjoy meat — making it the most sustainable diet for long-term weight management.',
    whyDoctorsRecommend:
      'Ranked top 3 for weight loss by U.S. News & World Report medical panel. Reduces calorie intake naturally through high-fiber plant foods, without the rigidity and "quit rate" of strict veganism.',
    whoIsItFor:
      'People who want to lose weight without feeling restricted, those transitioning toward plant-based eating, or anyone who wants the health benefits of vegetarianism while keeping food social and flexible.',
    calorieRange: { min: 1200, max: 2000 },
    macroTargets: { proteinPct: 20, carbsPct: 50, fatPct: 30 },
    keyNutrients: ['Fiber', 'Plant protein', 'Iron', 'Vitamin B12', 'Zinc'],
    limitedFoods: ['Meat (reduce, not eliminate)', 'Processed meats', 'Saturated fats', 'Added sugars'],
    encouragedFoods: [
      'Legumes (beans, lentils)', 'Tofu & tempeh', 'Whole grains',
      'Vegetables (especially leafy greens)', 'Fruits', 'Eggs', 'Nuts & seeds',
      'Occasional lean meat', 'Plant-based milks',
    ],
    sodiumLimitMg: 2500,
    legalDisclaimer:
      'Based on Flexitarian dietary framework by registered dietitians. General wellness information only — not a substitute for personalized nutritional advice.',
    color: '#F2994A',
    icon: '🥗',
  },
};

// ─── Scoring Helpers ────────────────────────────────────────────────────────

export interface FoodNutrition {
  sodiumMg: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  proteinG: number;
  calories: number;
}

export function scoreFoodForDiet(nutrition: FoodNutrition, dietPlan: string): number {
  const plan = DIET_PLANS[dietPlan];
  if (!plan) return 50;

  let score = 100;

  if (dietPlan === 'dash') {
    if (nutrition.sodiumMg > 600) score -= 30;
    else if (nutrition.sodiumMg > 400) score -= 15;
    if (nutrition.fatG > 15) score -= 15;
    if (nutrition.fiberG > 3) score += 10;
  }

  if (dietPlan === 'mediterranean') {
    if (nutrition.sugarG > 20) score -= 20;
    if (nutrition.fatG > 0 && nutrition.fiberG > 3) score += 10; // healthy fats + fiber = good
    if (nutrition.proteinG > 15) score += 5;
  }

  if (dietPlan === 'flexitarian') {
    if (nutrition.fiberG > 5) score += 20;
    if (nutrition.fiberG > 3) score += 10;
    if (nutrition.calories > 500) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

// ─── Exercise MET Map (also used in burnCalculator) ────────────────────────

export const EXERCISE_TYPES = [
  { id: 'walk', label: 'Walking', icon: '🚶', met: 3.5 },
  { id: 'run', label: 'Running', icon: '🏃', met: 8.0 },
  { id: 'cycle', label: 'Cycling', icon: '🚴', met: 7.5 },
  { id: 'swim', label: 'Swimming', icon: '🏊', met: 7.0 },
  { id: 'gym_weights', label: 'Weight Training', icon: '🏋️', met: 5.5 },
  { id: 'gym_hiit', label: 'HIIT', icon: '⚡', met: 8.0 },
  { id: 'yoga', label: 'Yoga', icon: '🧘', met: 3.0 },
  { id: 'dancing', label: 'Dancing', icon: '💃', met: 5.0 },
  { id: 'stairs', label: 'Stair Climbing', icon: '🪜', met: 8.0 },
  { id: 'sport', label: 'Team Sport', icon: '⚽', met: 7.0 },
  { id: 'pilates', label: 'Pilates', icon: '🤸', met: 3.5 },
  { id: 'walk_weighted', label: 'Weighted Walk', icon: '🎒', met: 4.5 },
];

// ─── Meal type helpers ────────────────────────────────────────────────────

export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: '🌅', timeRange: '5:00-10:59' },
  { id: 'lunch', label: 'Lunch', icon: '☀️', timeRange: '11:00-14:59' },
  { id: 'dinner', label: 'Dinner', icon: '🌙', timeRange: '15:00-21:59' },
  { id: 'snack', label: 'Snack', icon: '🍎', timeRange: 'anytime' },
];

export function detectMealType(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 22) return 'dinner';
  return 'snack';
}
