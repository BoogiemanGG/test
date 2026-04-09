import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePro, AuthRequest } from '../middleware/auth';
import { fetchRecipes, getRecipeById, findRecipesFromIngredients } from '../services/recipeEngine';

const router = Router();
const prisma = new PrismaClient();

// GET /api/recipes?diet=dash&maxCal=600&cuisine=italian&q=chicken
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { diet, maxCal, cuisine, q, page = '1' } = req.query;
  try {
    const recipes = await fetchRecipes({
      diet: diet as string,
      maxCalories: maxCal ? parseInt(maxCal as string) : undefined,
      cuisine: cuisine as string,
      query: q as string,
      page: parseInt(page as string),
    });
    return res.json(recipes);
  } catch {
    return res.status(500).json({ error: 'Could not fetch recipes.' });
  }
});

// POST /api/recipes/from-ingredients — fridge items → matching recipes
router.post('/from-ingredients', authenticate, requirePro, async (req: AuthRequest, res: Response) => {
  const { ingredients, diet } = req.body;
  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: 'Ingredients array required.' });
  }
  try {
    const recipes = await findRecipesFromIngredients(ingredients, diet, req.userId!);
    return res.json(recipes);
  } catch {
    return res.status(500).json({ error: 'Could not find recipes.' });
  }
});

// GET /api/recipes/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const recipe = await getRecipeById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });
    return res.json(recipe);
  } catch {
    return res.status(500).json({ error: 'Could not fetch recipe.' });
  }
});

// POST /api/recipes/:id/save
router.post('/:id/save', authenticate, async (req: AuthRequest, res: Response) => {
  const { rating, notes } = req.body;
  try {
    const saved = await prisma.savedRecipe.upsert({
      where: { userId_recipeId: { userId: req.userId!, recipeId: req.params.id } },
      update: { rating, notes },
      create: { userId: req.userId!, recipeId: req.params.id, rating, notes },
    });
    return res.json(saved);
  } catch {
    return res.status(500).json({ error: 'Could not save recipe.' });
  }
});

// DELETE /api/recipes/:id/save
router.delete('/:id/save', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.savedRecipe.deleteMany({
      where: { recipeId: req.params.id, userId: req.userId! },
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Could not remove saved recipe.' });
  }
});

// GET /api/recipes/saved — user's personal cookbook
router.get('/user/saved', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const saved = await prisma.savedRecipe.findMany({
      where: { userId: req.userId! },
      include: { recipe: true },
      orderBy: { savedAt: 'desc' },
    });
    return res.json(saved);
  } catch {
    return res.status(500).json({ error: 'Could not load cookbook.' });
  }
});

// PUT /api/recipes/:id/cooked — increment times cooked
router.put('/:id/cooked', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const saved = await prisma.savedRecipe.update({
      where: { userId_recipeId: { userId: req.userId!, recipeId: req.params.id } },
      data: { timesCooked: { increment: 1 } },
    });
    return res.json(saved);
  } catch {
    return res.status(500).json({ error: 'Could not update.' });
  }
});

export default router;
