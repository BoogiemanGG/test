/**
 * recipeEngine.ts
 * Spoonacular integration — recipe search, fridge-to-recipe, shopping list generation
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SPOONACULAR_BASE = 'https://api.spoonacular.com';

interface RecipeQuery {
  diet?: string;
  maxCalories?: number;
  cuisine?: string;
  query?: string;
  page?: number;
}

// Diet plan mappings to Spoonacular diet params
const DIET_MAP: Record<string, string> = {
  dash: 'dash',
  mediterranean: 'mediterranean',
  flexitarian: 'vegetarian',
  keto: 'ketogenic',
  vegan: 'vegan',
  gluten_free: 'gluten free',
};

export async function fetchRecipes(params: RecipeQuery) {
  const { diet, maxCalories, cuisine, query, page = 1 } = params;
  const offset = (page - 1) * 20;

  try {
    const res = await axios.get(`${SPOONACULAR_BASE}/recipes/complexSearch`, {
      params: {
        apiKey: process.env.SPOONACULAR_API_KEY,
        diet: diet ? DIET_MAP[diet] : undefined,
        maxCalories,
        cuisine,
        query,
        number: 20,
        offset,
        addRecipeNutrition: true,
        fillIngredients: false,
        instructionsRequired: true,
        sort: 'popularity',
      },
    });

    return res.data.results.map(mapSpoonacularRecipe);
  } catch {
    // Fallback to local DB
    return prisma.recipe.findMany({
      where: {
        ...(diet === 'dash' && { dietDash: true }),
        ...(diet === 'mediterranean' && { dietMed: true }),
        ...(diet === 'flexitarian' && { dietFlex: true }),
        ...(query && { title: { contains: query, mode: 'insensitive' } }),
      },
      take: 20,
      skip: (page - 1) * 20,
    });
  }
}

export async function getRecipeById(id: string) {
  // Check if numeric (Spoonacular) or UUID (local DB)
  if (!isNaN(Number(id))) {
    try {
      const res = await axios.get(`${SPOONACULAR_BASE}/recipes/${id}/information`, {
        params: {
          apiKey: process.env.SPOONACULAR_API_KEY,
          includeNutrition: true,
        },
      });
      return mapSpoonacularRecipeDetail(res.data);
    } catch {
      return null;
    }
  }
  return prisma.recipe.findUnique({ where: { id }, include: { ingredients: true } });
}

export async function findRecipesFromIngredients(ingredients: string[], diet: string, userId: string) {
  try {
    // Step 1: Find recipes by ingredients (Spoonacular)
    const res = await axios.get(`${SPOONACULAR_BASE}/recipes/findByIngredients`, {
      params: {
        apiKey: process.env.SPOONACULAR_API_KEY,
        ingredients: ingredients.join(','),
        number: 15,
        ranking: 1,       // maximize used ingredients
        ignorePantry: true,
      },
    });

    const recipeIds = res.data.map((r: any) => r.id).slice(0, 9); // 3 per diet = 9 total

    // Step 2: Get nutrition details for these recipes
    const detailsRes = await axios.get(`${SPOONACULAR_BASE}/recipes/informationBulk`, {
      params: {
        apiKey: process.env.SPOONACULAR_API_KEY,
        ids: recipeIds.join(','),
        includeNutrition: true,
      },
    });

    const allRecipes = detailsRes.data.map(mapSpoonacularRecipeDetail);

    // Step 3: Sort into 3 diet categories
    return {
      dash: allRecipes.filter((r: any) => r.sodiumServing < 600).slice(0, 3),
      mediterranean: allRecipes.filter((r: any) => r.fatServing > 5).slice(0, 3),
      flexitarian: allRecipes.filter((r: any) => r.fiberServing > 3).slice(0, 3),
      all: allRecipes,
    };
  } catch {
    return { dash: [], mediterranean: [], flexitarian: [], all: [] };
  }
}

export async function analyzeFridge(imageBuffer: Buffer, userId: string) {
  const { scanFridgeInventory } = await import('./foodRecognition');
  const detected = await scanFridgeInventory(imageBuffer);
  const ingredients = detected.map((d: any) => d.name);

  const [recipes, profile] = await Promise.all([
    findRecipesFromIngredients(ingredients, 'all', userId),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);

  return {
    detectedIngredients: detected,
    recipeSuggestions: recipes,
    userDietPlan: profile?.dietPlan || 'mediterranean',
    remainingCalories: await getRemainingCalories(userId),
  };
}

export async function generateSmartShoppingList(userId: string): Promise<number> {
  const [pantryItems, savedRecipes, profile] = await Promise.all([
    prisma.pantryItem.findMany({ where: { userId, usedAt: null } }),
    prisma.savedRecipe.findMany({
      where: { userId },
      include: { recipe: { include: { ingredients: true } } },
      take: 5,
      orderBy: { timesCooked: 'desc' },
    }),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);

  const pantryNames = pantryItems.map(p => p.itemName.toLowerCase());
  const itemsToAdd: Array<{ itemName: string; reason: string; isOrganic: boolean }> = [];

  // Check what's missing for favorite recipes
  for (const saved of savedRecipes) {
    for (const ingredient of saved.recipe.ingredients) {
      const name = ingredient.ingredientName.toLowerCase();
      const inPantry = pantryNames.some(p => p.includes(name) || name.includes(p));
      if (!inPantry) {
        itemsToAdd.push({
          itemName: ingredient.ingredientName,
          reason: `recipe_ingredient`,
          isOrganic: profile?.organicMode || false,
        });
      }
    }
  }

  // Check for expiring items that need replacement
  const expiring = pantryItems.filter(p => {
    if (!p.expiryDate) return false;
    const daysLeft = (p.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 3;
  });
  for (const item of expiring) {
    itemsToAdd.push({
      itemName: item.itemName,
      reason: 'expiry_replacement',
      isOrganic: profile?.organicMode || false,
    });
  }

  // Deduplicate
  const unique = itemsToAdd.filter((item, index, arr) =>
    arr.findIndex(i => i.itemName.toLowerCase() === item.itemName.toLowerCase()) === index
  );

  await prisma.shoppingItem.createMany({
    data: unique.map(item => ({ userId, ...item, quantity: 1, unit: 'piece' })),
    skipDuplicates: true,
  });

  return unique.length;
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function mapSpoonacularRecipe(r: any) {
  const nutrients = r.nutrition?.nutrients || [];
  const getNutrient = (name: string) =>
    nutrients.find((n: any) => n.name === name)?.amount || 0;

  return {
    id: String(r.id),
    title: r.title,
    imageUrl: r.image,
    caloriesServing: getNutrient('Calories'),
    proteinServing: getNutrient('Protein'),
    carbsServing: getNutrient('Carbohydrates'),
    fatServing: getNutrient('Fat'),
    fiberServing: getNutrient('Fiber'),
    sodiumServing: getNutrient('Sodium'),
    prepTimeMins: r.readyInMinutes || 0,
    servings: r.servings || 2,
    dietDash: r.lowFodmap || false,
    dietMed: r.mediterranean || false,
    dietFlex: r.vegetarian || false,
    dietVegan: r.vegan || false,
    cuisine: r.cuisines?.[0] || null,
  };
}

function mapSpoonacularRecipeDetail(r: any) {
  const base = mapSpoonacularRecipe(r);
  return {
    ...base,
    instructions: r.instructions || '',
    ingredients: r.extendedIngredients?.map((i: any) => ({
      ingredientName: i.name,
      quantity: i.amount,
      unit: i.unit,
    })) || [],
    tags: [...(r.cuisines || []), ...(r.dishTypes || []), ...(r.diets || [])],
  };
}

async function getRemainingCalories(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [entries, profile] = await Promise.all([
    prisma.diaryEntry.findMany({ where: { userId, loggedAt: { gte: today, lt: tomorrow } } }),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);

  const eaten = entries.reduce((sum, e) => sum + e.calories, 0);
  return Math.max(0, (profile?.calorieTarget || 2000) - eaten);
}
