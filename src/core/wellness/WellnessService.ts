/** Aggregates over self-reported wellness data. Pure functions. */

import { addDays, toISODate } from '../utils/date';
import type { ActivityLog, MoodEntry, WellnessGoal } from './types';

export interface DaySeriesPoint {
  date: string;
  value: number;
}

export function lastNDates(n: number, now: Date = new Date()): string[] {
  const out: string[] = [];
  for (let offset = n - 1; offset >= 0; offset -= 1) out.push(toISODate(addDays(now, -offset)));
  return out;
}

export function activitySeries(
  logs: ActivityLog[],
  field: 'steps' | 'sleepHours' | 'waterGlasses' | 'activeMinutes',
  days = 7,
  now: Date = new Date(),
): DaySeriesPoint[] {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  return lastNDates(days, now).map((date) => ({
    date,
    value: byDate.get(date)?.[field] ?? 0,
  }));
}

export function average(points: DaySeriesPoint[]): number {
  const withData = points.filter((p) => p.value > 0);
  if (withData.length === 0) return 0;
  return withData.reduce((sum, p) => sum + p.value, 0) / withData.length;
}

/** Consecutive days ending today that met the goal. */
export function goalStreak(
  logs: ActivityLog[],
  goal: WellnessGoal,
  now: Date = new Date(),
): number {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  let streak = 0;
  for (let offset = 0; offset < 120; offset += 1) {
    const log = byDate.get(toISODate(addDays(now, -offset)));
    if (!log || log.steps < goal.stepsPerDay) break;
    streak += 1;
  }
  return streak;
}

export function todayLog(logs: ActivityLog[], now: Date = new Date()): ActivityLog | null {
  const today = toISODate(now);
  return logs.find((l) => l.date === today) ?? null;
}

export function recentMoods(moods: MoodEntry[], days = 7, now: Date = new Date()): MoodEntry[] {
  const from = toISODate(addDays(now, -(days - 1)));
  return moods.filter((m) => m.date >= from).sort((a, b) => a.date.localeCompare(b.date));
}

export function moodAverage(moods: MoodEntry[]): number | null {
  if (moods.length === 0) return null;
  return moods.reduce((sum, m) => sum + m.mood, 0) / moods.length;
}

/** How many consecutive recent days were logged at mood 2 or below. */
export function lowMoodRun(moods: MoodEntry[]): number {
  const sorted = [...moods].sort((a, b) => b.date.localeCompare(a.date));
  let run = 0;
  for (const entry of sorted) {
    if (entry.mood <= 2) run += 1;
    else break;
  }
  return run;
}

export function todayMood(moods: MoodEntry[], now: Date = new Date()): MoodEntry | null {
  const today = toISODate(now);
  return moods.find((m) => m.date === today) ?? null;
}
