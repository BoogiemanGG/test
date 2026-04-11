import { Router, Response } from 'express';
import { authenticate, requirePro, AuthRequest } from '../middleware/auth';
import { askAICoach } from '../services/aiCoach';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const prisma = new PrismaClient();

const router = Router();

// POST /api/voice/query — text or transcribed voice question → AI response
router.post('/query', authenticate, requirePro, async (req: AuthRequest, res: Response) => {
  const { message, context } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required.' });

  try {
    const response = await askAICoach({
      userId: req.userId!,
      message,
      context,  // optional: { location, currentTime, mealType }
    });
    return res.json({ reply: response });
  } catch {
    return res.status(500).json({ error: 'AI coach unavailable.' });
  }
});

// POST /api/voice/mood — "I feel tired/stressed/energized" → food suggestions
router.post('/mood', authenticate, async (req: AuthRequest, res: Response) => {
  const { mood } = req.body;
  if (!mood) return res.status(400).json({ error: 'Mood is required.' });

  try {
    const pantryItems = await prisma.pantryItem.findMany({
      where: { userId: req.userId!, usedAt: null },
      take: 15,
      orderBy: { expiryDate: 'asc' },
    });
    const profile = await prisma.userProfile.findUnique({ where: { userId: req.userId! } });
    const pantryNames = pantryItems.map(p => p.itemName).join(', ') || 'not scanned yet';

    const moodPrompts: Record<string, string> = {
      tired: 'boost energy naturally with iron, B vitamins, and complex carbs',
      stressed: 'reduce cortisol and calm the nervous system with magnesium and omega-3 foods',
      energized: 'maintain this energy with protein and healthy fats',
      sick: 'support immune system recovery with vitamin C, zinc, and hydration',
      hungry: 'satisfy hunger with high-volume, low-calorie foods high in fiber',
      bloated: 'reduce bloating with anti-inflammatory, easy-to-digest foods',
    };

    const moodGoal = moodPrompts[mood.toLowerCase()] || `feel better when ${mood}`;
    const prompt = `The user feels "${mood}". Their goal: ${moodGoal}.
Their pantry has: ${pantryNames}
Their diet plan: ${profile?.dietPlan || 'mediterranean'}

Suggest 3 specific foods or small meals that will help. For each:
1. Name the food (preferably from their pantry if possible)
2. Why it helps (1 sentence, science-based)
3. How to eat it quickly (1 sentence)

Keep the whole response under 120 words. Be warm and practical.
End with: "General wellness info only — not medical advice."`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    return res.json({ mood, suggestions: result.response.text() });
  } catch {
    return res.status(500).json({ error: 'Could not get mood suggestions.' });
  }
});

export default router;
