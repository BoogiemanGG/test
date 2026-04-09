import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { authenticate, requirePro, AuthRequest } from '../middleware/auth';
import { scanFridgeInventory } from '../services/foodRecognition';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// GET /api/pantry — full inventory
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.pantryItem.findMany({
      where: { userId: req.userId!, usedAt: null },
      include: { food: true },
      orderBy: [{ expiryDate: 'asc' }, { addedAt: 'desc' }],
    });
    return res.json(items);
  } catch {
    return res.status(500).json({ error: 'Could not load pantry.' });
  }
});

// GET /api/pantry/expiring — items expiring within 3 days
router.get('/expiring', authenticate, async (req: AuthRequest, res: Response) => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + 3);
  try {
    const items = await prisma.pantryItem.findMany({
      where: {
        userId: req.userId!,
        usedAt: null,
        expiryDate: { lte: threshold },
      },
      include: { food: true },
      orderBy: { expiryDate: 'asc' },
    });
    return res.json(items);
  } catch {
    return res.status(500).json({ error: 'Could not load expiring items.' });
  }
});

// POST /api/pantry/scan — fridge photo → detect items + add to pantry
router.post('/scan', authenticate, requirePro, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No photo provided.' });
  try {
    const detected = await scanFridgeInventory(req.file.buffer);
    const created = await Promise.all(
      detected.map((item: any) =>
        prisma.pantryItem.create({
          data: {
            userId: req.userId!,
            itemName: item.name,
            quantityG: item.estimatedWeightG || 0,
            unit: item.unit || 'g',
            freshnessScore: item.freshnessScore || 100,
            expiryDate: item.estimatedExpiry ? new Date(item.estimatedExpiry) : null,
          },
        })
      )
    );
    return res.json({ added: created.length, items: created });
  } catch {
    return res.status(500).json({ error: 'Fridge scan failed.' });
  }
});

// POST /api/pantry — manually add item
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { itemName, quantityG, unit, expiryDate, isOrganic } = req.body;
  if (!itemName) return res.status(400).json({ error: 'Item name required.' });
  try {
    const item = await prisma.pantryItem.create({
      data: {
        userId: req.userId!,
        itemName,
        quantityG: quantityG || 0,
        unit: unit || 'g',
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });
    return res.status(201).json(item);
  } catch {
    return res.status(500).json({ error: 'Could not add item.' });
  }
});

// PUT /api/pantry/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { quantityG, unit, expiryDate, freshnessScore } = req.body;
  try {
    const item = await prisma.pantryItem.updateMany({
      where: { id: req.params.id, userId: req.userId! },
      data: { quantityG, unit, expiryDate: expiryDate ? new Date(expiryDate) : undefined, freshnessScore },
    });
    return res.json(item);
  } catch {
    return res.status(500).json({ error: 'Could not update item.' });
  }
});

// DELETE /api/pantry/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.pantryItem.updateMany({
      where: { id: req.params.id, userId: req.userId! },
      data: { usedAt: new Date() },
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Could not remove item.' });
  }
});

export default router;
