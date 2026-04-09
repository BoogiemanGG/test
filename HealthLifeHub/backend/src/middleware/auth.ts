import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  isPro?: boolean;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided.' });
    return;
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; isPro: boolean };
    req.userId = payload.userId;
    req.isPro = payload.isPro;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requirePro(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.isPro) {
    res.status(403).json({
      error: 'This feature requires HealthLifeHub Pro.',
      upgradeUrl: '/upgrade',
    });
    return;
  }
  next();
}
