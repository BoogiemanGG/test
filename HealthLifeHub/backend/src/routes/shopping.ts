import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePro, AuthRequest } from '../middleware/auth';
import { generateSmartShoppingList } from '../services/recipeEngine';

const router = Router();
const prisma = new PrismaClient();

// GET /api/shopping/list
router.get('/list', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.shoppingItem.findMany({
      where: { userId: req.userId!, isPurchased: false },
      include: { food: true },
      orderBy: { addedAt: 'desc' },
    });
    return res.json(items);
  } catch {
    return res.status(500).json({ error: 'Could not load shopping list.' });
  }
});

// POST /api/shopping/generate — auto-generate from pantry + saved recipes
router.post('/generate', authenticate, requirePro, async (req: AuthRequest, res: Response) => {
  try {
    const added = await generateSmartShoppingList(req.userId!);
    return res.json({ added, message: `Added ${added} items to your shopping list.` });
  } catch {
    return res.status(500).json({ error: 'Could not generate shopping list.' });
  }
});

// POST /api/shopping/add
router.post('/add', authenticate, async (req: AuthRequest, res: Response) => {
  const { itemName, quantity, unit, isOrganic, reason } = req.body;
  if (!itemName) return res.status(400).json({ error: 'Item name required.' });
  try {
    const item = await prisma.shoppingItem.create({
      data: {
        userId: req.userId!,
        itemName,
        quantity: quantity || 1,
        unit: unit || 'piece',
        isOrganic: isOrganic || false,
        reason: reason || 'manual',
      },
    });
    return res.status(201).json(item);
  } catch {
    return res.status(500).json({ error: 'Could not add item.' });
  }
});

// PUT /api/shopping/:id/purchased
router.put('/:id/purchased', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.shoppingItem.updateMany({
      where: { id: req.params.id, userId: req.userId! },
      data: { isPurchased: true },
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Could not update item.' });
  }
});

// DELETE /api/shopping/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.shoppingItem.deleteMany({
      where: { id: req.params.id, userId: req.userId! },
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Could not delete item.' });
  }
});

export default router;
