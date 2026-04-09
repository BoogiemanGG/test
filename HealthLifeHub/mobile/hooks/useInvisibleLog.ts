/**
 * useInvisibleLog — Persistent context awareness hook
 * Maintains a "living story" of the user's day without manual input
 */
import { useState, useCallback } from 'react';
import { api } from '../services/api';

interface DiaryStatus {
  totalEaten: number;
  totalBurned: number;
  netCalories: number;
  calorieTarget: number;
  remaining: number;
  proteinEaten: number;
  proteinTarget: number;
  proteinGoalMet: boolean;
  message: string;
}

export function useInvisibleLog() {
  const [status, setStatus] = useState<DiaryStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/diary/status');
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, loading, loadStatus };
}
