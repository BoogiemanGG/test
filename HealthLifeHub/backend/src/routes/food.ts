import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth';
import { analyzePhoto } from '../services/foodRecognition';
import { analyzeFridge } from '../services/recipeEngine';
import { lookupBarcode, searchFoods } from '../services/nutritionCalc';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// POST /api/food/analyze-photo — snap a plate → calories + macros
router.post('/analyze-photo', authenticate, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No photo provided.' });
  try {
    const result = await analyzePhoto(req.file.buffer, req.userId!);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not analyze photo.' });
  }
});

// POST /api/food/analyze-fridge — snap fridge → inventory + 3 recipes per diet
router.post('/analyze-fridge', authenticate, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No photo provided.' });
  try {
    const result = await analyzeFridge(req.file.buffer, req.userId!);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not analyze fridge.' });
  }
});

// POST /api/food/analyze-barcode
router.post('/analyze-barcode', authenticate, async (req: AuthRequest, res: Response) => {
  const { barcode } = req.body;
  if (!barcode) return res.status(400).json({ error: 'Barcode is required.' });
  try {
    const food = await lookupBarcode(barcode);
    if (!food) return res.status(404).json({ error: 'Food not found for this barcode.' });
    return res.json(food);
  } catch {
    return res.status(500).json({ error: 'Barcode lookup failed.' });
  }
});

// GET /api/food/search?q=banana&diet=dash
router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
  const query = req.query.q as string;
  const diet = req.query.diet as string | undefined;
  if (!query) return res.status(400).json({ error: 'Search query required.' });
  try {
    const results = await searchFoods(query, diet);
    return res.json(results);
  } catch {
    return res.status(500).json({ error: 'Search failed.' });
  }
});

export default router;
