import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePro, AuthRequest } from '../middleware/auth';
import { generateWeeklyReport } from '../services/weeklyReport';

const router = Router();
const prisma = new PrismaClient();

// GET /api/report/weekly — generate or fetch this week's report
router.get('/weekly', authenticate, requirePro, async (req: AuthRequest, res: Response) => {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);

  try {
    // Check if already generated this week
    let report = await prisma.weeklyReport.findFirst({
      where: { userId: req.userId!, weekStart: { gte: weekStart } },
    });
    if (!report) {
      report = await generateWeeklyReport(req.userId!, weekStart);
    }
    return res.json(report);
  } catch {
    return res.status(500).json({ error: 'Could not generate report.' });
  }
});

// GET /api/report/history
router.get('/history', authenticate, requirePro, async (req: AuthRequest, res: Response) => {
  try {
    const reports = await prisma.weeklyReport.findMany({
      where: { userId: req.userId! },
      orderBy: { weekStart: 'desc' },
      take: 12,  // last 12 weeks
    });
    return res.json(reports);
  } catch {
    return res.status(500).json({ error: 'Could not load report history.' });
  }
});

export default router;
