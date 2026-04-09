// HealthLifeHub — Shared TypeScript types

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isPro: boolean;
  language: SupportedLanguage;
  avatarUrl?: string;
}

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'zh' | 'ja' | 'ar' | 'hi';

// ─── Diet Plans ───────────────────────────────────────────────────────────────

export type DietPlanId = 'dash' | 'mediterranean' | 'flexitarian' | 'keto' | 'vegan' | 'gluten_free';
export type GoalType = 'lose_weight' | 'maintain' | 'gain_muscle';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface UserProfile {
  id: string;
  userId: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  weightKg?: number;
  heightCm?: number;
  activityLevel: ActivityLevel;
  goal: GoalType;
  calorieTarget: number;
  dietPlan: DietPlanId;
  allergies: string[];
  organicMode: boolean;
}

// ─── Food & Nutrition ────────────────────────────────────────────────────────

export interface FoodItem {
  id: string;
  externalId?: string;
  name: string;
  brand?: string;
  barcode?: string;
  calories100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  fiber100g: number;
  sugar100g: number;
  sodium100mg: number;
  vitaminC?: number;
  vitaminD?: number;
  iron?: number;
  calcium?: number;
  omega3?: number;
  potassium?: number;
  dashScore: number;
  medScore: number;
  flexScore: number;
  isOrganic: boolean;
  imageUrl?: string;
}

export interface FoodAnalysisResult {
  detectedItems: DetectedFoodItem[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  plateScoreOut100: number;
  dietCompatibility: {
    dash: number;
    mediterranean: number;
    flexitarian: number;
  };
  suggestions: string[];
}

export interface DetectedFoodItem {
  name: string;
  confidence: number;
  estimatedWeightG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sodiumMg: number;
}

// ─── Diary ───────────────────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MoodType = 'happy' | 'stressed' | 'bored' | 'hungry' | 'neutral';

export interface DiaryEntry {
  id: string;
  userId: string;
  foodId?: string;
  recipeId?: string;
  mealType: MealType;
  quantityG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
  photoUrl?: string;
  loggedAt: string;
  location?: string;
  mood?: MoodType;
  notes?: string;
  food?: Pick<FoodItem, 'id' | 'name' | 'imageUrl'>;
  recipe?: Pick<Recipe, 'id' | 'title' | 'imageUrl'>;
}

export interface DailyTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
}

export interface DiaryStatus {
  totalEaten: number;
  totalBurned: number;
  netCalories: number;
  calorieTarget: number;
  remaining: number;
  proteinEaten: number;
  proteinTarget: number;
  proteinGoalMet: boolean;
  message: string;
}

// ─── Recipes ─────────────────────────────────────────────────────────────────

export interface Recipe {
  id: string;
  externalId?: string;
  title: string;
  imageUrl?: string;
  prepTimeMins: number;
  cookTimeMins: number;
  servings: number;
  caloriesServing: number;
  proteinServing: number;
  carbsServing: number;
  fatServing: number;
  fiberServing: number;
  sodiumServing: number;
  dietDash: boolean;
  dietMed: boolean;
  dietFlex: boolean;
  dietKeto: boolean;
  dietVegan: boolean;
  dietGlutenFree: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  isOrganic: boolean;
  instructions?: string;
  tags: string[];
  ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  isOptional: boolean;
}

export interface SavedRecipe {
  id: string;
  userId: string;
  recipeId: string;
  rating?: number;
  timesCooked: number;
  notes?: string;
  savedAt: string;
  recipe: Recipe;
}

export interface RecipeTrioResult {
  dash: Recipe[];
  mediterranean: Recipe[];
  flexitarian: Recipe[];
  all: Recipe[];
}

// ─── Pantry ──────────────────────────────────────────────────────────────────

export interface PantryItem {
  id: string;
  userId: string;
  foodId?: string;
  food?: Pick<FoodItem, 'id' | 'name' | 'calories100g'>;
  itemName: string;
  quantityG: number;
  unit: string;
  photoUrl?: string;
  expiryDate?: string;
  freshnessScore: number;
  addedAt: string;
  usedAt?: string;
}

// ─── Exercise ────────────────────────────────────────────────────────────────

export type ExerciseType =
  | 'walk' | 'walk_weighted' | 'run' | 'cycle' | 'cycle_stationary'
  | 'swim' | 'gym_weights' | 'gym_hiit' | 'gym_cardio' | 'yoga'
  | 'pilates' | 'dancing' | 'stairs' | 'sport';

export type EffortLevel = 'light' | 'moderate' | 'intense' | 'max';

export interface ExerciseEntry {
  id: string;
  userId: string;
  exerciseType: ExerciseType;
  durationMins: number;
  caloriesBurned: number;
  distanceKm?: number;
  steps?: number;
  loadDetected: boolean;
  loadMultiplier: number;
  avgHeartRate?: number;
  effortLevel?: EffortLevel;
  loggedAt: string;
  notes?: string;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface WeeklyReport {
  id: string;
  userId: string;
  weekStart: string;
  avgDailyCalories: number;
  goalHitDays: number;
  topFood?: string;
  weakestDay?: string;
  bestDay?: string;
  healthMomentumScore: number;
  dietAdherencePct: number;
  plantVarietyCount: number;
  organicPct: number;
  hydrationAvgMl: number;
  personalityLabel?: string;
  aiInsight?: string;
  createdAt: string;
}

// ─── Shopping ────────────────────────────────────────────────────────────────

export interface ShoppingItem {
  id: string;
  userId: string;
  itemName: string;
  quantity: number;
  unit: string;
  reason?: string;
  isOrganic: boolean;
  isPurchased: boolean;
  addedAt: string;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  hasMore: boolean;
}
