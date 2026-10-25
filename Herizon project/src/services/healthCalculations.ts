/**
 * HerHealth Deterministic Calculations & Safety Engine
 * 
 * NON-NEGOTIABLE MEDICAL BOUNDARIES:
 * - NEVER diagnose a disease.
 * - NEVER prescribe medicines, dosages, supplements, remedies, or treatment plans.
 * - NEVER replace a clinician's judgment.
 * - All calculations are strictly deterministic, transparent, and evidence-backed.
 */

import { SymptomLog, SleepLog, HealthMeasurement, UrgentSafetyAlert } from '../types';

// Emergency helpline for India (with clear instruction)
export const EMERGENCY_NUMBER_INDIA = '112';

/**
 * 1. Calculate Sleep Duration across Midnight
 * Handles bedtime and wake time crossing dates/midnight seamlessly.
 */
export function calculateSleepDurationMinutes(bedtimeIso: string, wakeTimeIso: string): number {
  const bed = new Date(bedtimeIso);
  let wake = new Date(wakeTimeIso);

  if (isNaN(bed.getTime()) || isNaN(wake.getTime())) {
    return 0;
  }

  let diffMs = wake.getTime() - bed.getTime();

  // If wake time was recorded earlier than bedtime on the same clock (crossing midnight)
  if (diffMs < 0) {
    // Add 24 hours in ms
    diffMs += 24 * 60 * 60 * 1000;
  }

  const minutes = Math.round(diffMs / (1000 * 60));
  return Math.max(0, minutes);
}

export function formatSleepDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours === 0) return `${remainingMins}m`;
  return `${hours}h ${remainingMins}m`;
}

/**
 * 2. Glucose Unit Conversions
 * Standard factor: 1 mmol/L = 18.0182 mg/dL
 */
export const GLUCOSE_CONVERSION_FACTOR = 18.0182;

export function convertGlucose(value: number, fromUnit: 'mg/dL' | 'mmol/L', toUnit: 'mg/dL' | 'mmol/L'): number {
  if (fromUnit === toUnit) return value;
  if (fromUnit === 'mg/dL' && toUnit === 'mmol/L') {
    return Number((value / GLUCOSE_CONVERSION_FACTOR).toFixed(2));
  }
  if (fromUnit === 'mmol/L' && toUnit === 'mg/dL') {
    return Math.round(value * GLUCOSE_CONVERSION_FACTOR);
  }
  return value;
}

/**
 * 3. Urgent Warning & Emergency Safety Check
 * Detects red-flag acute symptoms and conservative severe measurement extremes.
 */
export function checkUrgentSafetyWarning(
  symptomTextOrName: string,
  measurements?: HealthMeasurement[]
): UrgentSafetyAlert | null {
  const lower = symptomTextOrName.toLowerCase();

  // Red-flag keywords for acute life-threatening situations
  const chestPainRedFlags = ['chest pain', 'chest pressure', 'radiating to arm', 'radiating to jaw', 'heavy chest'];
  const breathingRedFlags = ['cannot breathe', 'severe breathlessness', 'struggling to breathe', 'gasping for air', 'severe shortness of breath'];
  const strokeRedFlags = ['face drooping', 'slurred speech', 'arm weakness', 'sudden numbness', 'loss of vision'];
  const severeHeadacheRedFlags = ['worst headache of life', 'thunderclap headache', 'sudden severe headache with stiff neck'];

  const hasChestPain = chestPainRedFlags.some(k => lower.includes(k));
  const hasBreathing = breathingRedFlags.some(k => lower.includes(k));
  const hasStroke = strokeRedFlags.some(k => lower.includes(k));
  const hasSevereHeadache = severeHeadacheRedFlags.some(k => lower.includes(k));

  if (hasChestPain || hasBreathing || hasStroke || hasSevereHeadache) {
    let reason = 'symptoms requiring immediate clinical evaluation';
    if (hasChestPain) reason = 'chest pain or severe pressure';
    else if (hasBreathing) reason = 'severe breathing difficulty';
    else if (hasStroke) reason = 'neurological symptoms (weakness/speech changes)';
    else if (hasSevereHeadache) reason = 'sudden severe headache';

    return {
      is_urgent: true,
      headline: 'Urgent Medical Attention Advised',
      description: `You have logged ${reason}. HerHealth cannot assess emergency risk or replace clinical care. Please seek immediate in-person medical evaluation.`,
      emergency_number: EMERGENCY_NUMBER_INDIA,
      instructions: [
        `Call emergency services at ${EMERGENCY_NUMBER_INDIA} immediately or go to the nearest emergency room.`,
        'Do not wait to see if symptoms improve on their own.',
        'Inform a family member or emergency contact right away.',
        'Rest in a comfortable position while waiting for help.'
      ]
    };
  }

  // Extreme Measurement Checks:
  if (measurements && measurements.length > 0) {
    for (const m of measurements) {
      if (m.measurement_type === 'blood_pressure') {
        const systolic = m.numeric_value;
        const diastolic = m.secondary_numeric_value || 0;
        // Hypertensive emergency threshold (Systolic > 180 or Diastolic > 120)
        if (systolic >= 180 || diastolic >= 120) {
          return {
            is_urgent: true,
            headline: 'Significantly Elevated Blood Pressure Reading',
            description: `A reading of ${systolic}/${diastolic} mmHg is significantly elevated. If accompanied by chest pain, shortness of breath, headache, or visual changes, seek emergency medical care immediately.`,
            emergency_number: EMERGENCY_NUMBER_INDIA,
            instructions: [
              'Rest quietly for 5 minutes and re-check to confirm the reading.',
              'If the reading remains >= 180 systolic or >= 120 diastolic, contact your doctor or visit an urgent care center promptly.',
              `Call ${EMERGENCY_NUMBER_INDIA} immediately if you experience chest pain, breathlessness, back pain, or vision changes.`
            ]
          };
        }
      }
    }
  }

  return null;
}

/**
 * 4. Recurrence & Pattern Detection
 * Identifies repeated symptoms, frequency trends, and sleep/stress co-occurrences.
 * Transparent, deterministic, and never claims disease causation.
 */
export interface SymptomPatternSummary {
  symptomName: string;
  totalCount: number;
  last30DaysCount: number;
  last7DaysCount: number;
  averageSeverity: number;
  dates: string[];
  coOccurredWithPoorSleepCount: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  explanatoryNote: string;
}

export function analyzeSymptomPatterns(
  symptoms: SymptomLog[],
  sleepLogs: SleepLog[] = []
): SymptomPatternSummary[] {
  if (!symptoms || symptoms.length === 0) return [];

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Group by normalized symptom name
  const grouped = new Map<string, SymptomLog[]>();
  for (const s of symptoms) {
    const key = s.symptom_name.trim().toLowerCase();
    const existing = grouped.get(key) || [];
    existing.push(s);
    grouped.set(key, existing);
  }

  const results: SymptomPatternSummary[] = [];

  for (const [key, items] of grouped.entries()) {
    // Sort descending by date
    items.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

    const totalCount = items.length;
    const last30 = items.filter(i => new Date(i.occurred_at) >= thirtyDaysAgo);
    const last7 = items.filter(i => new Date(i.occurred_at) >= sevenDaysAgo);

    const sumSeverity = items.reduce((acc, curr) => acc + (curr.severity || 5), 0);
    const avgSeverity = Number((sumSeverity / totalCount).toFixed(1));

    const dates = items.map(i => i.occurred_at.split('T')[0]);

    // Check co-occurrence with poor sleep (< 6h) on same or prior night
    let poorSleepCoCount = 0;
    for (const item of items) {
      const itemDate = item.occurred_at.split('T')[0];
      const matchingSleep = sleepLogs.find(sl => {
        const sleepDate = sl.wake_time.split('T')[0];
        return sleepDate === itemDate && sl.total_minutes < 360;
      });
      if (matchingSleep) {
        poorSleepCoCount++;
      }
    }

    // Trend calculation
    // Compare last 14 days vs prior 14 days
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const countRecent14 = items.filter(i => {
      const d = new Date(i.occurred_at);
      return d >= fourteenDaysAgo && d <= now;
    }).length;

    const countPrior14 = items.filter(i => {
      const d = new Date(i.occurred_at);
      return d >= twentyEightDaysAgo && d < fourteenDaysAgo;
    }).length;

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (countRecent14 > countPrior14 && countRecent14 >= 2) {
      trend = 'increasing';
    } else if (countRecent14 < countPrior14 && countPrior14 >= 2) {
      trend = 'decreasing';
    }

    const displayName = items[0].symptom_name;
    let explanatoryNote = `You logged ${displayName} on ${last30.length} day(s) this month.`;
    if (poorSleepCoCount > 0) {
      explanatoryNote += ` It co-occurred with less than 6 hours of sleep on ${poorSleepCoCount} occasion(s).`;
    }
    explanatoryNote += ' Consider discussing this recurring pattern with your healthcare professional.';

    results.push({
      symptomName: displayName,
      totalCount,
      last30DaysCount: last30.length,
      last7DaysCount: last7.length,
      averageSeverity: avgSeverity,
      dates,
      coOccurredWithPoorSleepCount: poorSleepCoCount,
      trend,
      explanatoryNote
    });
  }

  // Sort by highest 30-day frequency
  results.sort((a, b) => b.last30DaysCount - a.last30DaysCount);
  return results;
}

/**
 * 5. Menstrual Cycle Estimator
 * Deterministic estimation from recorded periods.
 * Explicitly labeled as an estimate; never claimed as birth control or diagnostic.
 */
export interface CycleEstimation {
  hasSufficientData: boolean;
  averageCycleLengthDays: number;
  averagePeriodDurationDays: number;
  cycleVariabilityDays: number;
  estimatedNextPeriodDate?: string;
  cycleCount: number;
  currentPhase?: 'follicular' | 'ovulatory' | 'luteal' | 'menstrual' | 'unknown';
  disclaimer: string;
}

export function calculateCycleEstimates(cycles: { start_date: string; end_date?: string; cycle_length_days?: number; period_duration_days?: number }[]): CycleEstimation {
  const disclaimer = 'Cycle dates and lengths are mathematical estimates based on your previous logs. They do not constitute medical advice or reliable contraception.';

  if (!cycles || cycles.length === 0) {
    return {
      hasSufficientData: false,
      averageCycleLengthDays: 28,
      averagePeriodDurationDays: 5,
      cycleVariabilityDays: 0,
      cycleCount: 0,
      disclaimer
    };
  }

  // Sort ascending
  const sorted = [...cycles].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const determinePhase = (daysElapsed: number, periodDays: number, cycleDays: number): CycleEstimation['currentPhase'] => {
    if (daysElapsed < 0) return 'unknown';
    if (daysElapsed < periodDays) return 'menstrual';
    if (daysElapsed < Math.floor(cycleDays / 2) - 2) return 'follicular';
    if (daysElapsed <= Math.floor(cycleDays / 2) + 2) return 'ovulatory';
    if (daysElapsed <= cycleDays) return 'luteal';
    return 'unknown';
  };

  if (sorted.length === 1) {
    const single = sorted[0];
    const avgCycle = single.cycle_length_days || 28;
    const avgPeriod = single.period_duration_days || 5;
    const lastRecorded = new Date(single.start_date);
    const nextDate = new Date(lastRecorded.getTime() + avgCycle * 24 * 60 * 60 * 1000);
    const diffDays = Math.floor((new Date().getTime() - lastRecorded.getTime()) / (1000 * 60 * 60 * 24));
    return {
      hasSufficientData: true,
      averageCycleLengthDays: avgCycle,
      averagePeriodDurationDays: avgPeriod,
      cycleVariabilityDays: 0,
      estimatedNextPeriodDate: isNaN(nextDate.getTime()) ? undefined : nextDate.toISOString().split('T')[0],
      cycleCount: 1,
      currentPhase: determinePhase(diffDays, avgPeriod, avgCycle),
      disclaimer
    };
  }

  const cycleLengths: number[] = [];
  const periodDurations: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].start_date);
    const curr = new Date(sorted[i].start_date);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 15 && diffDays <= 60) {
      cycleLengths.push(diffDays);
    }
  }

  for (const c of sorted) {
    if (c.end_date) {
      const s = new Date(c.start_date);
      const e = new Date(c.end_date);
      const dur = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (dur >= 1 && dur <= 14) {
        periodDurations.push(dur);
      }
    }
  }

  const avgCycle = cycleLengths.length > 0
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
    : 28;

  const avgPeriod = periodDurations.length > 0
    ? Math.round(periodDurations.reduce((a, b) => a + b, 0) / periodDurations.length)
    : 5;

  // Variability (standard deviation)
  let variability = 0;
  if (cycleLengths.length > 1) {
    const mean = avgCycle;
    const variance = cycleLengths.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / cycleLengths.length;
    variability = Math.round(Math.sqrt(variance));
  }

  // Estimate next period
  const lastRecorded = new Date(sorted[sorted.length - 1].start_date);
  const nextDate = new Date(lastRecorded.getTime() + avgCycle * 24 * 60 * 60 * 1000);
  const estimatedNextPeriodDate = nextDate.toISOString().split('T')[0];
  const diffDays = Math.floor((new Date().getTime() - lastRecorded.getTime()) / (1000 * 60 * 60 * 24));

  return {
    hasSufficientData: cycleLengths.length >= 1,
    averageCycleLengthDays: avgCycle,
    averagePeriodDurationDays: avgPeriod,
    cycleVariabilityDays: variability,
    estimatedNextPeriodDate,
    cycleCount: sorted.length,
    currentPhase: determinePhase(diffDays, avgPeriod, avgCycle),
    disclaimer
  };
}

/**
 * 6. Lab Result Reference Range Check
 * Evaluates whether a value falls outside the lab-provided reference interval.
 * Never guesses an unprovided range or declares an illness.
 */
export function evaluateLabResult(
  value: number,
  min?: number,
  max?: number
): { isOutside: boolean | null; statusText: string } {
  if (min === undefined && max === undefined) {
    return { isOutside: null, statusText: 'No reference interval provided by laboratory' };
  }

  if (min !== undefined && value < min) {
    return { isOutside: true, statusText: 'Below laboratory reference interval' };
  }

  if (max !== undefined && value > max) {
    return { isOutside: true, statusText: 'Above laboratory reference interval' };
  }

  return { isOutside: false, statusText: 'Within laboratory reference interval' };
}
