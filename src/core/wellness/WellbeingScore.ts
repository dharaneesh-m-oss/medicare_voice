/**
 * DIGITAL WELLBEING SCORE.
 *
 * One number from five pillars the patient actually logged. It is deliberately
 * transparent: every pillar reports its own value, its weight, and whether it had
 * any data at all, so the UI can always answer "why is it 68?".
 *
 * Honesty rules baked in:
 *  - A pillar with no data is EXCLUDED and the remaining weights are
 *    renormalised. The score never quietly punishes someone for not logging.
 *  - It is a self-care summary of logged habits, not a clinical measure, and it
 *    never appears without that framing.
 */

import { adherenceRate } from '../scheduler/MedicationScheduler';
import type { DoseRecord, ScheduleEntry } from '../types';
import { addDays, toISODate } from '../utils/date';
import type { ActivityLog, MoodEntry, WellnessGoal } from './types';
import { activitySeries, average, recentMoods } from './WellnessService';

export type PillarKey = 'movement' | 'sleep' | 'hydration' | 'mood' | 'medication';

export interface Pillar {
  key: PillarKey;
  /** 0..100 */
  value: number;
  /** share of the final score, after renormalisation */
  weight: number;
  hasData: boolean;
  /** the raw number behind the pillar, for the "why" line */
  detail: { actual: number; target: number };
}

export interface WellbeingScore {
  /** 0..100, or null when nothing at all has been logged. */
  score: number | null;
  band: 'low' | 'fair' | 'good' | 'strong';
  pillars: Pillar[];
  /** percentage-point change against the previous 7 days. */
  trend: number | null;
  daysLogged: number;
}

const BASE_WEIGHTS: Record<PillarKey, number> = {
  movement: 0.25,
  sleep: 0.25,
  hydration: 0.15,
  mood: 0.2,
  medication: 0.15,
};

/** Ratio to 0..100, capped — exceeding a goal does not inflate the score. */
function ratioScore(actual: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((actual / target) * 100)));
}

export interface ScoreInput {
  activity: ActivityLog[];
  moods: MoodEntry[];
  schedules: ScheduleEntry[];
  records: DoseRecord[];
  goal: WellnessGoal;
  /** window length in days */
  days?: number;
  now?: Date;
  /** offset the whole window back by this many days (used for the trend) */
  offsetDays?: number;
}

function computeRaw(input: ScoreInput): { score: number | null; pillars: Pillar[]; daysLogged: number } {
  const days = input.days ?? 7;
  const now = input.offsetDays
    ? addDays(input.now ?? new Date(), -input.offsetDays)
    : (input.now ?? new Date());

  const from = toISODate(addDays(now, -(days - 1)));
  const to = toISODate(now);
  const logs = input.activity.filter((a) => a.date >= from && a.date <= to);
  const moods = input.moods.filter((m) => m.date >= from && m.date <= to);

  const steps = average(activitySeries(logs, 'steps', days, now));
  const sleep = average(activitySeries(logs, 'sleepHours', days, now));
  const water = average(activitySeries(logs, 'waterGlasses', days, now));
  const moodList = recentMoods(moods, days, now);
  const moodAvg =
    moodList.length > 0 ? moodList.reduce((sum, m) => sum + m.mood, 0) / moodList.length : 0;
  const adherence = adherenceRate(input.schedules, input.records, days, now);

  const pillars: Pillar[] = [
    {
      key: 'movement',
      value: ratioScore(steps, input.goal.stepsPerDay),
      weight: BASE_WEIGHTS.movement,
      hasData: steps > 0,
      detail: { actual: Math.round(steps), target: input.goal.stepsPerDay },
    },
    {
      key: 'sleep',
      value: ratioScore(sleep, input.goal.sleepHoursPerNight),
      weight: BASE_WEIGHTS.sleep,
      hasData: sleep > 0,
      detail: { actual: Number(sleep.toFixed(1)), target: input.goal.sleepHoursPerNight },
    },
    {
      key: 'hydration',
      value: ratioScore(water, input.goal.waterGlassesPerDay),
      weight: BASE_WEIGHTS.hydration,
      hasData: water > 0,
      detail: { actual: Math.round(water), target: input.goal.waterGlassesPerDay },
    },
    {
      key: 'mood',
      // 1..5 self-report mapped onto 0..100.
      value: moodAvg > 0 ? Math.round(((moodAvg - 1) / 4) * 100) : 0,
      weight: BASE_WEIGHTS.mood,
      hasData: moodList.length > 0,
      detail: { actual: Number(moodAvg.toFixed(1)), target: 5 },
    },
    {
      key: 'medication',
      value: adherence?.percent ?? 0,
      weight: BASE_WEIGHTS.medication,
      hasData: adherence !== null,
      detail: { actual: adherence?.taken ?? 0, target: adherence?.total ?? 0 },
    },
  ];

  const withData = pillars.filter((p) => p.hasData);
  if (withData.length === 0) {
    return { score: null, pillars, daysLogged: 0 };
  }

  // Renormalise so missing pillars do not drag the score down.
  const totalWeight = withData.reduce((sum, p) => sum + p.weight, 0);
  const normalised = pillars.map((p) => ({
    ...p,
    weight: p.hasData ? p.weight / totalWeight : 0,
  }));
  const score = Math.round(
    normalised.reduce((sum, p) => sum + p.value * p.weight, 0),
  );

  const daysLogged = new Set([...logs.map((l) => l.date), ...moods.map((m) => m.date)]).size;
  return { score, pillars: normalised, daysLogged };
}

export function computeWellbeingScore(input: ScoreInput): WellbeingScore {
  const current = computeRaw(input);
  const previous = computeRaw({ ...input, offsetDays: (input.days ?? 7) });

  const score = current.score;
  const band: WellbeingScore['band'] =
    score === null || score < 45 ? 'low' : score < 65 ? 'fair' : score < 82 ? 'good' : 'strong';

  return {
    score,
    band,
    pillars: current.pillars,
    trend:
      score !== null && previous.score !== null && previous.score > 0
        ? score - previous.score
        : null,
    daysLogged: current.daysLogged,
  };
}
