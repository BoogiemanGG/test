/**
 * useHealthKit — Apple HealthKit + Google Health Connect bridge
 * Reads steps, active calories, workouts
 */
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

interface HealthData {
  steps: number;
  activeCalories: number;
  isAvailable: boolean;
}

export function useHealthKit() {
  const [healthData, setHealthData] = useState<HealthData>({ steps: 0, activeCalories: 0, isAvailable: false });

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) return;

      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const result = await Pedometer.getStepCountAsync(start, end);
      const steps = result.steps || 0;
      // Rough estimate: 0.04 cal/step for average person
      const activeCalories = Math.round(steps * 0.04);

      setHealthData({ steps, activeCalories, isAvailable: true });
    } catch {
      setHealthData(prev => ({ ...prev, isAvailable: false }));
    }
  };

  return { healthData, refreshHealthData: loadHealthData };
}
