import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getDiaryStatus } from '../services/nutritionCalc';

const router = Router();
const prisma = new PrismaClient();

// GET /api/diary/today — full invisible log for today
router.get('/today', authenticate, async (req: AuthRequest, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    const entries = await prisma.diaryEntry.findMany({
      where: { userId: req.userId!, loggedAt: { gte: today, lt: tomorrow } },
      include: { food: true, recipe: true },
      orderBy: { loggedAt: 'asc' },
    });
    const totals = entries.reduce((acc, e) => ({
      calories: acc.calories + e.calories,
      proteinG: acc.proteinG + e.proteinG,
      carbsG: acc.carbsG + e.carbsG,
      fatG: acc.fatG + e.fatG,
      fiberG: acc.fiberG + e.fiberG,
      sodiumMg: acc.sodiumMg + e.sodiumMg,
    }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sodiumMg: 0 });

    return res.json({ entries, totals });
  } catch {
    return res.status(500).json({ error: 'Could not load diary.' });
  }
});

// GET /api/diary/status — AI-style status message ("You have 450 cal left")
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const status = await getDiaryStatus(req.userId!);
    return res.json(status);
  } catch {
    return res.status(500).json({ error: 'Could not get status.' });
  }
});

// POST /api/diary/log — add a food entry
router.post('/log', authenticate, async (req: AuthRequest, res: Response) => {
  const { foodId, recipeId, mealType, quantityG, calories, proteinG, carbsG, fatG, sodiumMg, fiberG, photoUrl, mood, notes } = req.body;
  if (!mealType || (!foodId && !recipeId && !calories)) {
    return res.status(400).json({ error: 'mealType and either foodId/recipeId or calories are required.' });
  }
  try {
    const entry = await prisma.diaryEntry.create({
      data: {
        userId: req.userId!,
        foodId, recipeId, mealType,
        quantityG: quantityG || 100,
        calories: calories || 0,
        proteinG: proteinG || 0,
        carbsG: carbsG || 0,
        fatG: fatG || 0,
        sodiumMg: sodiumMg || 0,
        fiberG: fiberG || 0,
        photoUrl, mood, notes,
      },
    });
    return res.status(201).json(entry);
  } catch {
    return res.status(500).json({ error: 'Could not log food.' });
  }
});

// DELETE /api/diary/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.diaryEntry.deleteMany({
      where: { id: req.params.id, userId: req.userId! },
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Could not delete entry.' });
  }
});

// GET /api/diary/history?days=7
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  const days = parseInt(req.query.days as string) || 7;
  const since = new Date();
  since.setDate(since.getDate() - days);
  try {
    const entries = await prisma.diaryEntry.findMany({
      where: { userId: req.userId!, loggedAt: { gte: since } },
      include: { food: true },
      orderBy: { loggedAt: 'desc' },
    });
    return res.json(entries);
  } catch {
    return res.status(500).json({ error: 'Could not load history.' });
  }
});

export default router;
