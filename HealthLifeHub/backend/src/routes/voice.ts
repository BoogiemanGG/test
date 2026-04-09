import { Router, Response } from 'express';
import { authenticate, requirePro, AuthRequest } from '../middleware/auth';
import { askAICoach } from '../services/aiCoach';

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

export default router;
