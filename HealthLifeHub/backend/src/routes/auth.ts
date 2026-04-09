import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().notEmpty(),
  body('language').optional().isIn(['en','es','fr','de','pt','it','zh','ja','ar','hi']),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password, name, language = 'en' } = req.body;
  try {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email already registered.' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, language },
    });
    // Create default profile
    await prisma.userProfile.create({
      data: { userId: user.id },
    });
    const token = jwt.sign(
      { userId: user.id, isPro: false },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );
    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, isPro: false, language },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign(
      { userId: user.id, isPro: user.isPro },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );
    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, isPro: user.isPro, language: user.language },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { profile: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { password: _, ...safe } = user;
    return res.json(safe);
  } catch {
    return res.status(500).json({ error: 'Could not fetch profile.' });
  }
});

// PUT /api/auth/profile  — update goals, diet plan, language, etc.
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  const { age, gender, weightKg, heightCm, activityLevel, goal, dietPlan, allergies, organicMode, language } = req.body;
  try {
    // Calculate calorie target based on profile
    let calorieTarget = 2000;
    if (weightKg && heightCm && age && gender) {
      // Mifflin-St Jeor BMR
      const bmr = gender === 'male'
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
      const activityMultipliers: Record<string, number> = {
        sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
      };
      const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);
      const goalAdjust: Record<string, number> = { lose_weight: -500, maintain: 0, gain_muscle: 300 };
      calorieTarget = Math.round(tdee + (goalAdjust[goal] || 0));
    }
    const profile = await prisma.userProfile.update({
      where: { userId: req.userId },
      data: { age, gender, weightKg, heightCm, activityLevel, goal, calorieTarget, dietPlan, allergies, organicMode },
    });
    if (language) {
      await prisma.user.update({ where: { id: req.userId }, data: { language } });
    }
    return res.json({ profile, calorieTarget });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Profile update failed.' });
  }
});

export default router;
