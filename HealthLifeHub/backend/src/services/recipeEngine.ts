/**
 * recipeEngine.ts
 * Gemini-powered recipe engine — generates recipes from ingredients and diet plans.
 * Replaces the old Spoonacular integration.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const prisma = new PrismaClient();

interface RecipeQuery {
  diet?: string;
  maxCalories?: number;
  cuisine?: string;
  query?: string;
  page?: number;
}

interface GeneratedRecipe {
  id: string;
  title: string;
  imageUrl: string | null;
  caloriesServing: number;
  proteinServing: number;
  carbsServing: number;
  fatServing: number;
  fiberServing: number;
  sodiumServing: number;
  prepTimeMins: number;
  servings: number;
  dietDash: boolean;
  dietMed: boolean;
  dietFlex: boolean;
  dietVegan: boolean;
  cuisine: string | null;
  instructions: string;
  ingredients: Array<{ ingredientName: string; quantity: number; unit: string }>;
  tags: string[];
}

export async function fetchRecipes(params: RecipeQuery) {
  const { diet, maxCalories, query, page = 1 } = params;

  // Try local DB first
  const dbResults = await prisma.recipe.findMany({
    where: {
      ...(diet === 'dash' && { dietDash: true }),
      ...(diet === 'mediterranean' && { dietMed: true }),
      ...(diet === 'flexitarian' && { dietFlex: true }),
      ...(query && { title: { contains: query } }),
    },
    take: 20,
    skip: (page - 1) * 20,
  });

  if (dbResults.length >= 5) return dbResults;

  // Generate recipes with Gemini if DB is sparse
  const recipes = await generateRecipesWithGemini({ diet, maxCalories, query, count: 10 });

  // Cache generated recipes in local DB for future use
  for (const r of recipes) {
    try {
      await prisma.recipe.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          title: r.title,
          imageUrl: r.imageUrl,
          caloriesServing: r.caloriesServing,
          proteinServing: r.proteinServing,
          carbsServing: r.carbsServing,
          fatServing: r.fatServing,
          fiberServing: r.fiberServing,
          sodiumServing: r.sodiumServing,
          prepTimeMins: r.prepTimeMins,
          servings: r.servings,
          dietDash: r.dietDash,
          dietMed: r.dietMed,
          dietFlex: r.dietFlex,
          dietVegan: r.dietVegan,
          cuisine: r.cuisine,
          instructions: r.instructions,
          tags: JSON.stringify(r.tags),
        },
      });
    } catch {
      // Skip duplicates
    }
  }

  return recipes;
}

export async function getRecipeById(id: string) {
  return prisma.recipe.findUnique({ where: { id }, include: { ingredients: true } });
}

export async function findRecipesFromIngredients(ingredients: string[], diet: string, _userId: string) {
  if (ingredients.length === 0) return { dash: [], mediterranean: [], flexitarian: [], all: [] };

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a recipe generator. Given these fridge ingredients: ${ingredients.slice(0, 15).join(', ')}

Generate 9 recipes (3 for each diet: DASH, Mediterranean, Flexitarian) that use mainly these ingredients.
Return ONLY a valid JSON object, no extra text:
{
  "dash": [
    {
      "title": "Recipe Name",
      "caloriesServing": 350,
      "proteinServing": 25,
      "carbsServing": 40,
      "fatServing": 8,
      "fiberServing": 5,
      "sodiumServing": 380,
      "prepTimeMins": 20,
      "servings": 2,
      "cuisine": "American",
      "instructions": "Step 1: ... Step 2: ...",
      "ingredients": [{"name": "chicken breast", "quantity": 200, "unit": "g"}],
      "tags": ["low-sodium", "heart-healthy"]
    }
  ],
  "mediterranean": [...],
  "flexitarian": [...]
}
DASH = low sodium (<600mg), Mediterranean = healthy fats + olive oil, Flexitarian = plant-forward.
Make recipes realistic and delicious.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { dash: [], mediterranean: [], flexitarian: [], all: [] };

    const parsed = JSON.parse(jsonMatch[0]);

    const mapRecipe = (r: any, dietFlags: { dietDash: boolean; dietMed: boolean; dietFlex: boolean }) => ({
      id: uuidv4(),
      title: String(r.title || 'Recipe'),
      imageUrl: null,
      caloriesServing: Number(r.caloriesServing) || 300,
      proteinServing: Number(r.proteinServing) || 15,
      carbsServing: Number(r.carbsServing) || 35,
      fatServing: Number(r.fatServing) || 10,
      fiberServing: Number(r.fiberServing) || 4,
      sodiumServing: Number(r.sodiumServing) || 400,
      prepTimeMins: Number(r.prepTimeMins) || 25,
      servings: Number(r.servings) || 2,
      cuisine: r.cuisine || null,
      instructions: String(r.instructions || ''),
      ingredients: (r.ingredients || []).map((i: any) => ({
        ingredientName: String(i.name || i.ingredientName || ''),
        quantity: Number(i.quantity) || 1,
        unit: String(i.unit || 'piece'),
      })),
      tags: Array.isArray(r.tags) ? r.tags : [],
      dietVegan: false,
      ...dietFlags,
    });

    const dash = (parsed.dash || []).slice(0, 3).map((r: any) =>
      mapRecipe(r, { dietDash: true, dietMed: false, dietFlex: false })
    );
    const mediterranean = (parsed.mediterranean || []).slice(0, 3).map((r: any) =>
      mapRecipe(r, { dietDash: false, dietMed: true, dietFlex: false })
    );
    const flexitarian = (parsed.flexitarian || []).slice(0, 3).map((r: any) =>
      mapRecipe(r, { dietDash: false, dietMed: false, dietFlex: true })
    );

    return {
      dash,
      mediterranean,
      flexitarian,
      all: [...dash, ...mediterranean, ...flexitarian],
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

  for (const saved of savedRecipes) {
    for (const ingredient of saved.recipe.ingredients) {
      const name = ingredient.ingredientName.toLowerCase();
      const inPantry = pantryNames.some(p => p.includes(name) || name.includes(p));
      if (!inPantry) {
        itemsToAdd.push({
          itemName: ingredient.ingredientName,
          reason: 'recipe_ingredient',
          isOrganic: profile?.organicMode || false,
        });
      }
    }
  }

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

  const unique = itemsToAdd.filter((item, index, arr) =>
    arr.findIndex(i => i.itemName.toLowerCase() === item.itemName.toLowerCase()) === index
  );

  await prisma.shoppingItem.createMany({
    data: unique.map(item => ({ userId, ...item, quantity: 1, unit: 'piece' })),
  });

  return unique.length;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

async function generateRecipesWithGemini(params: {
  diet?: string;
  maxCalories?: number;
  query?: string;
  count: number;
}): Promise<GeneratedRecipe[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const dietDesc = params.diet === 'dash'
    ? 'DASH diet (low sodium, heart-healthy)'
    : params.diet === 'mediterranean'
    ? 'Mediterranean diet (healthy fats, fish, vegetables, olive oil)'
    : params.diet === 'flexitarian'
    ? 'Flexitarian diet (mostly plant-based, occasional lean meat)'
    : 'balanced, healthy';

  const calorieStr = params.maxCalories ? `, under ${params.maxCalories} calories per serving` : '';
  const queryStr = params.query ? `, related to "${params.query}"` : '';

  const prompt = `Generate ${params.count} healthy ${dietDesc} recipes${calorieStr}${queryStr}.
Return ONLY a valid JSON array, no extra text:
[
  {
    "title": "Recipe Name",
    "caloriesServing": 350,
    "proteinServing": 25,
    "carbsServing": 40,
    "fatServing": 10,
    "fiberServing": 5,
    "sodiumServing": 400,
    "prepTimeMins": 25,
    "servings": 2,
    "cuisine": "Mediterranean",
    "instructions": "Step 1: Chop vegetables. Step 2: ...",
    "ingredients": [{"name": "chicken breast", "quantity": 200, "unit": "g"}],
    "tags": ["healthy", "quick"]
  }
]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    const isDash = params.diet === 'dash';
    const isMed = params.diet === 'mediterranean';
    const isFlex = params.diet === 'flexitarian';

    return parsed.map((r: any): GeneratedRecipe => ({
      id: uuidv4(),
      title: String(r.title || 'Healthy Recipe'),
      imageUrl: null,
      caloriesServing: Number(r.caloriesServing) || 300,
      proteinServing: Number(r.proteinServing) || 15,
      carbsServing: Number(r.carbsServing) || 35,
      fatServing: Number(r.fatServing) || 10,
      fiberServing: Number(r.fiberServing) || 4,
      sodiumServing: Number(r.sodiumServing) || 400,
      prepTimeMins: Number(r.prepTimeMins) || 25,
      servings: Number(r.servings) || 2,
      dietDash: isDash,
      dietMed: isMed,
      dietFlex: isFlex,
      dietVegan: false,
      cuisine: r.cuisine || null,
      instructions: String(r.instructions || ''),
      ingredients: (r.ingredients || []).map((i: any) => ({
        ingredientName: String(i.name || i.ingredientName || ''),
        quantity: Number(i.quantity) || 1,
        unit: String(i.unit || 'piece'),
      })),
      tags: Array.isArray(r.tags) ? r.tags : [],
    }));
  } catch {
    return [];
  }
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
