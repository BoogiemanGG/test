import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import foodRoutes from './routes/food';
import recipesRoutes from './routes/recipes';
import pantryRoutes from './routes/pantry';
import diaryRoutes from './routes/diary';
import exerciseRoutes from './routes/exercise';
import voiceRoutes from './routes/voice';
import reportRoutes from './routes/report';
import shoppingRoutes from './routes/shopping';

dotenv.config();

const app = express();

// Replit assigns PORT automatically via environment variable.
// Fallback to 3000 for local dev.
const PORT = process.env.PORT || 3000;

// Security & performance middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
// On Replit, the app is accessed via a *.replit.dev public URL.
// We allow all origins here so the mobile app can reach the API.
// Tighten this in production by setting ALLOWED_ORIGINS.
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));      // large for photo uploads
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Stricter limit on AI/photo endpoints (costly operations)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'AI request limit reached. Wait a moment.' },
});
app.use('/api/food/analyze', aiLimiter);
app.use('/api/voice', aiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/exercise', exerciseRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/shopping', shoppingRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'HealthLifeHub', version: '1.0.0' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// Replit requires binding to '0.0.0.0', not 'localhost'.
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`HealthLifeHub API running on port ${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
});

export default app;
