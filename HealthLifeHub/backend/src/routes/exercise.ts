import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateBurn } from '../services/burnCalculator';

const router = Router();
const prisma = new PrismaClient();

// POST /api/exercise/log
router.post('/log', authenticate, async (req: AuthRequest, res: Response) => {
  const {
    exerciseType, durationMins, distanceKm, steps,
    loadDetected, loadMultiplier, avgHeartRate, effortLevel, notes,
  } = req.body;
  if (!exerciseType || !durationMins) {
    return res.status(400).json({ error: 'exerciseType and durationMins required.' });
  }
  try {
    // Get user weight for accurate calorie calc
    const profile = await prisma.userProfile.findUnique({ where: { userId: req.userId! } });
    const weightKg = profile?.weightKg || 70;

    const caloriesBurned = calculateBurn({
      exerciseType, durationMins, weightKg, distanceKm,
      steps, loadDetected, loadMultiplier, avgHeartRate, effortLevel,
    });

    const entry = await prisma.exerciseEntry.create({
      data: {
        userId: req.userId!,
        exerciseType, durationMins, caloriesBurned,
        distanceKm, steps,
        loadDetected: loadDetected || false,
        loadMultiplier: loadMultiplier || 1.0,
        avgHeartRate, effortLevel, notes,
      },
    });
    return res.status(201).json({ ...entry, caloriesBurned });
  } catch {
    return res.status(500).json({ error: 'Could not log exercise.' });
  }
});

// GET /api/exercise/today
router.get('/today', authenticate, async (req: AuthRequest, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    const entries = await prisma.exerciseEntry.findMany({
      where: { userId: req.userId!, loggedAt: { gte: today, lt: tomorrow } },
      orderBy: { loggedAt: 'desc' },
    });
    const totalBurned = entries.reduce((sum, e) => sum + e.caloriesBurned, 0);
    const totalSteps = entries.reduce((sum, e) => sum + (e.steps || 0), 0);
    return res.json({ entries, totalBurned: Math.round(totalBurned), totalSteps });
  } catch {
    return res.status(500).json({ error: 'Could not load exercise data.' });
  }
});

// GET /api/exercise/history?days=7
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  const days = parseInt(req.query.days as string) || 7;
  const since = new Date();
  since.setDate(since.getDate() - days);
  try {
    const entries = await prisma.exerciseEntry.findMany({
      where: { userId: req.userId!, loggedAt: { gte: since } },
      orderBy: { loggedAt: 'desc' },
    });
    return res.json(entries);
  } catch {
    return res.status(500).json({ error: 'Could not load exercise history.' });
  }
});

export default router;
