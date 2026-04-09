/**
 * burnCalculator.ts
 * Calorie burn calculator using MET values + IMU load detection
 */

interface BurnInput {
  exerciseType: string;
  durationMins: number;
  weightKg: number;
  distanceKm?: number;
  steps?: number;
  loadDetected?: boolean;
  loadMultiplier?: number;
  avgHeartRate?: number;
  effortLevel?: string;
}

// MET (Metabolic Equivalent of Task) values per activity
const MET_VALUES: Record<string, number> = {
  // Walking
  walk: 3.5,
  walk_slow: 2.8,
  walk_fast: 4.3,
  walk_uphill: 6.0,
  walk_weighted: 4.5,    // carrying load
  // Running
  run: 8.0,
  run_slow: 6.0,
  run_fast: 11.5,
  run_trail: 9.0,
  // Cycling
  cycle: 7.5,
  cycle_slow: 5.5,
  cycle_fast: 10.0,
  cycle_stationary: 7.0,
  // Gym
  gym: 5.0,
  gym_weights: 5.5,
  gym_hiit: 8.0,
  gym_cardio: 7.0,
  // Other
  swim: 7.0,
  yoga: 3.0,
  pilates: 3.5,
  dancing: 5.0,
  stairs: 8.0,
  sport: 7.0,
  cleaning: 3.5,
  standing: 1.5,
};

export function calculateBurn(input: BurnInput): number {
  const {
    exerciseType,
    durationMins,
    weightKg,
    loadDetected = false,
    loadMultiplier = 1.0,
    avgHeartRate,
    effortLevel,
  } = input;

  // Determine base MET
  let met = MET_VALUES[exerciseType] || MET_VALUES['walk'];

  // Adjust for effort level (overrides generic MET)
  if (effortLevel) {
    const effortAdjust: Record<string, number> = {
      light: 0.7,
      moderate: 1.0,
      intense: 1.3,
      max: 1.6,
    };
    met *= effortAdjust[effortLevel] || 1.0;
  }

  // Heart rate-based adjustment (Karvonen-inspired)
  if (avgHeartRate && avgHeartRate > 100) {
    const hrAdjust = Math.min(1.4, 1 + (avgHeartRate - 100) / 200);
    met *= hrAdjust;
  }

  // Apply load multiplier for weighted walks (carrying groceries, child, backpack)
  const effectiveMultiplier = loadDetected ? (loadMultiplier || 1.25) : 1.0;

  // Calorie burn formula: MET × weight(kg) × time(hours)
  const hours = durationMins / 60;
  const baseBurn = met * weightKg * hours * effectiveMultiplier;

  // Add TEF (Thermic Effect) post-exercise bonus for intense workouts
  const tefBonus = effortLevel === 'intense' || effortLevel === 'max' ? baseBurn * 0.08 : 0;

  return Math.round(baseBurn + tefBonus);
}

// Estimate calories from step count (when no explicit exercise is logged)
export function burnFromSteps(steps: number, weightKg: number): number {
  // Average: 1 step ≈ 0.04 calories for 70kg person, scaled by weight
  const caloriesPerStep = 0.04 * (weightKg / 70);
  return Math.round(steps * caloriesPerStep);
}

// Detect effort level from heart rate zones
export function heartRateToEffort(heartRate: number, age: number): string {
  const maxHR = 220 - age;
  const pct = heartRate / maxHR;
  if (pct < 0.5) return 'light';
  if (pct < 0.7) return 'moderate';
  if (pct < 0.85) return 'intense';
  return 'max';
}

// Estimate NEAT (Non-Exercise Activity Thermogenesis) for the day
export function estimateNEAT(steps: number, weightKg: number, activityLevel: string): number {
  const baseNEAT: Record<string, number> = {
    sedentary: 200, light: 350, moderate: 500, active: 700, very_active: 900,
  };
  const base = baseNEAT[activityLevel] || 500;
  const stepBonus = burnFromSteps(steps, weightKg);
  return Math.round(base + stepBonus);
}
