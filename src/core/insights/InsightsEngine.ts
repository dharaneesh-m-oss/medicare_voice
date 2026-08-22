/**
 * INSIGHTS ENGINE — the health-intelligence layer.
 *
 * WHAT IT IS: a deterministic, fully explainable rules-and-statistics engine
 * that reads the patient's own recorded data (dose history, medicine supply,
 * vitals against the range their DOCTOR set, self-reported activity and mood)
 * and surfaces things worth attention.
 *
 * WHAT IT IS NOT: it does not diagnose, does not score any clinical scale, does
 * not name conditions and does not change any dose. Every insight carries the
 * evidence it was derived from, and anything clinical ends at "check with your
 * doctor or pharmacist".
 *
 * Like the recognition engine, this sits behind an interface. A trained
 * on-device model (e.g. adherence-risk prediction from longer histories) can
 * replace `RuleBasedInsightsEngine` through `setInsightsEngine()` without any
 * screen changing.
 */

import type { PatientProfile } from '../auth/types';
import type { VitalReading, VitalTarget } from '../clinic/types';
import { VITAL_UNITS } from '../clinic/types';
import type { Appointment } from '../clinic/types';
import { appointmentTimestamp } from '../clinic/AppointmentService';
import { buildDayView } from '../scheduler/MedicationScheduler';
import type { DoseRecord, Medicine, ScheduleEntry } from '../types';
import { TIMES_PER_FREQUENCY } from '../types';
import { addDays, formatTime12h, toISODate } from '../utils/date';
import { checkExpiry } from '../verification/VerificationEngine';
import type { ActivityLog, MoodEntry, WellnessGoal } from '../wellness/types';
import {
  activitySeries,
  average,
  goalStreak,
  lowMoodRun,
  moodAverage,
  recentMoods,
} from '../wellness/WellnessService';
import { computeWellbeingScore } from '../wellness/WellbeingScore';

export type InsightKind =
  | 'adherence'
  | 'refill'
  | 'expiry'
  | 'vitals'
  | 'wellness'
  | 'mood'
  | 'appointment';

export type InsightSeverity = 'good' | 'info' | 'attention' | 'urgent';

export interface Insight {
  id: string;
  kind: InsightKind;
  severity: InsightSeverity;
  /** Translation keys — the engine never emits sentences. */
  titleKey: string;
  detailKey: string;
  params: Record<string, string | number>;
  /** Optional screen the UI can jump to. */
  actionScreen?: string;
  actionLabelKey?: string;
}

export interface InsightsInput {
  patient: PatientProfile | null;
  schedules: ScheduleEntry[];
  doseRecords: DoseRecord[];
  medicines: Medicine[];
  appointments: Appointment[];
  vitals: VitalReading[];
  vitalTargets: VitalTarget[];
  activity: ActivityLog[];
  moods: MoodEntry[];
  goal: WellnessGoal;
  now?: Date;
}

export interface InsightsEngine {
  readonly id: string;
  readonly displayName: string;
  readonly approach: 'rule_based' | 'on_device_model';
  analyse(input: InsightsInput): Insight[];
}

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  urgent: 0,
  attention: 1,
  info: 2,
  good: 3,
};

/* ------------------------------------------------------------------ */

export class RuleBasedInsightsEngine implements InsightsEngine {
  readonly id = 'rules-insights-v1';
  readonly displayName = 'Rule-based Insights Engine';
  readonly approach = 'rule_based' as const;

  analyse(input: InsightsInput): Insight[] {
    const now = input.now ?? new Date();
    const out: Insight[] = [
      ...this.adherence(input, now),
      ...this.refill(input),
      ...this.expiry(input, now),
      ...this.vitals(input),
      ...this.wellness(input, now),
      ...this.hydration(input, now),
      ...this.sleepConsistency(input, now),
      ...this.streak(input, now),
      ...this.moodSleepLink(input, now),
      ...this.wellbeingTrend(input, now),
      ...this.mood(input, now),
      ...this.appointments(input, now),
    ];
    return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }

  /* ---- 1. adherence over the last 14 days, per schedule ---- */
  private adherence(input: InsightsInput, now: Date): Insight[] {
    const out: Insight[] = [];

    for (const schedule of input.schedules.filter((s) => s.active && s.times.length > 0)) {
      let total = 0;
      let taken = 0;
      const missedByTime = new Map<string, number>();

      for (let offset = 13; offset >= 0; offset -= 1) {
        const date = toISODate(addDays(now, -offset));
        for (const view of buildDayView([schedule], input.doseRecords, date, now)) {
          if (view.status === 'upcoming') continue;
          total += 1;
          if (view.status === 'taken') taken += 1;
          else missedByTime.set(view.time, (missedByTime.get(view.time) ?? 0) + 1);
        }
      }

      if (total < 6) continue;
      const rate = taken / total;
      if (rate >= 0.85) continue;

      const worst = [...missedByTime.entries()].sort((a, b) => b[1] - a[1])[0];
      out.push({
        id: `adherence-${schedule.id}`,
        kind: 'adherence',
        severity: rate < 0.6 ? 'urgent' : 'attention',
        titleKey: 'insight.adherence_title',
        detailKey: worst ? 'insight.adherence_detail_slot' : 'insight.adherence_detail',
        params: {
          name: schedule.medicineName,
          percent: Math.round(rate * 100),
          missed: total - taken,
          total,
          time: worst ? formatTime12h(worst[0]) : '',
        },
        actionScreen: 'schedule',
        actionLabelKey: 'home.schedule',
      });
    }

    return out;
  }

  /* ---- 2. refill forecast from recorded supply ---- */
  private refill(input: InsightsInput): Insight[] {
    const out: Insight[] = [];

    for (const medicine of input.medicines) {
      if (medicine.unitsLeft === null || medicine.unitsLeft === undefined) continue;

      const perDose = medicine.unitsPerDose ?? 1;
      const dosesPerDay = input.schedules
        .filter(
          (s) =>
            s.active &&
            s.medicineName.toLowerCase() === medicine.name.toLowerCase(),
        )
        .reduce((sum, s) => {
          const perDay = TIMES_PER_FREQUENCY[s.frequency];
          if (s.frequency === 'every_other_day') return sum + perDay / 2;
          if (s.frequency === 'weekly') return sum + perDay / 7;
          return sum + perDay;
        }, 0);

      if (dosesPerDay <= 0) continue;
      const daysLeft = Math.floor(medicine.unitsLeft / (dosesPerDay * perDose));
      if (daysLeft > 10) continue;

      out.push({
        id: `refill-${medicine.id}`,
        kind: 'refill',
        severity: daysLeft <= 3 ? 'urgent' : 'attention',
        titleKey: 'insight.refill_title',
        detailKey: 'insight.refill_detail',
        params: { name: medicine.name, days: Math.max(0, daysLeft), units: medicine.unitsLeft },
        actionScreen: 'medicines',
        actionLabelKey: 'home.medicines',
      });
    }

    return out;
  }

  /* ---- 3. expiry sweep of the cabinet ---- */
  private expiry(input: InsightsInput, now: Date): Insight[] {
    const expired: string[] = [];
    const soon: string[] = [];

    for (const medicine of input.medicines) {
      const check = checkExpiry(medicine.expiry, now);
      if (check.status === 'expired') expired.push(medicine.name);
      else if (check.status === 'expiring_soon') soon.push(medicine.name);
    }

    const out: Insight[] = [];
    if (expired.length > 0) {
      out.push({
        id: 'expiry-expired',
        kind: 'expiry',
        severity: 'urgent',
        titleKey: 'insight.expired_title',
        detailKey: 'insight.expired_detail',
        params: { count: expired.length, names: expired.join(', ') },
        actionScreen: 'medicines',
        actionLabelKey: 'home.medicines',
      });
    }
    if (soon.length > 0) {
      out.push({
        id: 'expiry-soon',
        kind: 'expiry',
        severity: 'attention',
        titleKey: 'insight.expiring_title',
        detailKey: 'insight.expiring_detail',
        params: { count: soon.length, names: soon.join(', ') },
        actionScreen: 'medicines',
        actionLabelKey: 'home.medicines',
      });
    }
    return out;
  }

  /* ---- 4. vitals against the range the doctor recorded ---- */
  private vitals(input: InsightsInput): Insight[] {
    const out: Insight[] = [];

    for (const target of input.vitalTargets) {
      const latest = input.vitals
        .filter((v) => v.type === target.type)
        .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
      if (!latest) continue;

      const primaryOut = latest.value < target.min || latest.value > target.max;
      const secondaryOut =
        target.secondaryMin !== null &&
        target.secondaryMax !== null &&
        latest.secondaryValue !== null &&
        (latest.secondaryValue < target.secondaryMin || latest.secondaryValue > target.secondaryMax);

      if (!primaryOut && !secondaryOut) continue;

      const reading =
        latest.secondaryValue !== null
          ? `${latest.value}/${latest.secondaryValue}`
          : String(latest.value);
      const range =
        target.secondaryMin !== null && target.secondaryMax !== null
          ? `${target.min}/${target.secondaryMin} – ${target.max}/${target.secondaryMax}`
          : `${target.min} – ${target.max}`;

      out.push({
        id: `vitals-${target.type}`,
        kind: 'vitals',
        severity: 'attention',
        titleKey: `vital.${target.type}`,
        detailKey: 'insight.vital_out_of_range',
        params: { reading, unit: VITAL_UNITS[target.type], range },
        actionScreen: 'records',
        actionLabelKey: 'records.title',
      });
    }

    return out;
  }

  /* ---- 5. activity and sleep against the patient's own goals ---- */
  private wellness(input: InsightsInput, now: Date): Insight[] {
    const out: Insight[] = [];

    const thisWeek = activitySeries(input.activity, 'steps', 7, now);
    const lastWeek = activitySeries(input.activity, 'steps', 14, now).slice(0, 7);
    const avgNow = average(thisWeek);
    const avgBefore = average(lastWeek);

    if (avgNow > 0) {
      const meetsGoal = avgNow >= input.goal.stepsPerDay;
      const change = avgBefore > 0 ? Math.round(((avgNow - avgBefore) / avgBefore) * 100) : 0;
      out.push({
        id: 'wellness-steps',
        kind: 'wellness',
        severity: meetsGoal ? 'good' : 'info',
        titleKey: meetsGoal ? 'insight.steps_good_title' : 'insight.steps_low_title',
        detailKey: 'insight.steps_detail',
        params: {
          average: Math.round(avgNow),
          goal: input.goal.stepsPerDay,
          change: change > 0 ? `+${change}` : String(change),
        },
        actionScreen: 'wellness',
        actionLabelKey: 'wellness.title',
      });
    }

    const sleep = average(activitySeries(input.activity, 'sleepHours', 7, now));
    if (sleep > 0 && sleep < input.goal.sleepHoursPerNight - 1) {
      out.push({
        id: 'wellness-sleep',
        kind: 'wellness',
        severity: 'info',
        titleKey: 'insight.sleep_title',
        detailKey: 'insight.sleep_detail',
        params: { hours: sleep.toFixed(1), goal: input.goal.sleepHoursPerNight },
        actionScreen: 'wellness',
        actionLabelKey: 'wellness.title',
      });
    }

    return out;
  }

  /* ---- 6. mood trend — supportive, never diagnostic ---- */
  private mood(input: InsightsInput, now: Date): Insight[] {
    const recent = recentMoods(input.moods, 7, now);
    if (recent.length < 3) return [];

    const avg = moodAverage(recent);
    const run = lowMoodRun(recent);
    if (avg === null) return [];

    if (run >= 3 || avg <= 2.2) {
      return [
        {
          id: 'mood-low',
          kind: 'mood',
          severity: 'attention',
          titleKey: 'insight.mood_low_title',
          detailKey: 'insight.mood_low_detail',
          params: { days: Math.max(run, recent.length), average: avg.toFixed(1) },
          actionScreen: 'mood',
          actionLabelKey: 'mood.title',
        },
      ];
    }

    if (avg >= 4) {
      return [
        {
          id: 'mood-good',
          kind: 'mood',
          severity: 'good',
          titleKey: 'insight.mood_good_title',
          detailKey: 'insight.mood_good_detail',
          params: { average: avg.toFixed(1), days: recent.length },
          actionScreen: 'mood',
          actionLabelKey: 'mood.title',
        },
      ];
    }

    return [];
  }

  /* ---- 7. the next checkup ---- */
  private appointments(input: InsightsInput, now: Date): Insight[] {
    const next = input.appointments
      .filter(
        (a) =>
          (a.status === 'confirmed' || a.status === 'requested') &&
          appointmentTimestamp(a) >= now.getTime(),
      )
      .sort((a, b) => appointmentTimestamp(a) - appointmentTimestamp(b))[0];
    if (!next) return [];

    const days = Math.ceil((appointmentTimestamp(next) - now.getTime()) / 86_400_000);
    if (days > 3) return [];

    return [
      {
        id: `appointment-${next.id}`,
        kind: 'appointment',
        severity: 'info',
        titleKey: 'insight.checkup_title',
        detailKey: days <= 0 ? 'insight.checkup_today' : 'insight.checkup_in_days',
        params: { days, time: formatTime12h(next.time) },
        actionScreen: 'appointments',
        actionLabelKey: 'appointments.title',
      },
    ];
  }

  /* ---- 8. hydration against the patient's own goal ---- */
  private hydration(input: InsightsInput, now: Date): Insight[] {
    const water = average(activitySeries(input.activity, 'waterGlasses', 7, now));
    if (water <= 0 || water >= input.goal.waterGlassesPerDay * 0.75) return [];
    return [
      {
        id: 'wellness-water',
        kind: 'wellness',
        severity: 'info',
        titleKey: 'insight.water_title',
        detailKey: 'insight.water_detail',
        params: { average: water.toFixed(1), goal: input.goal.waterGlassesPerDay },
        actionScreen: 'wellness',
        actionLabelKey: 'wellness.title',
      },
    ];
  }

  /* ---- 9. sleep CONSISTENCY, not just duration ---- */
  private sleepConsistency(input: InsightsInput, now: Date): Insight[] {
    const nights = activitySeries(input.activity, 'sleepHours', 7, now)
      .map((p) => p.value)
      .filter((v) => v > 0);
    if (nights.length < 5) return [];

    const mean = nights.reduce((sum, v) => sum + v, 0) / nights.length;
    const spread = Math.sqrt(
      nights.reduce((sum, v) => sum + (v - mean) ** 2, 0) / nights.length,
    );
    if (spread < 1.2) return [];

    return [
      {
        id: 'wellness-sleep-consistency',
        kind: 'wellness',
        severity: 'info',
        titleKey: 'insight.sleep_varies_title',
        detailKey: 'insight.sleep_varies_detail',
        params: {
          spread: spread.toFixed(1),
          low: Math.min(...nights).toFixed(1),
          high: Math.max(...nights).toFixed(1),
        },
        actionScreen: 'wellness',
        actionLabelKey: 'wellness.title',
      },
    ];
  }

  /* ---- 10. something going right is worth saying ---- */
  private streak(input: InsightsInput, now: Date): Insight[] {
    const streak = goalStreak(input.activity, input.goal, now);
    if (streak < 3) return [];
    return [
      {
        id: 'wellness-streak',
        kind: 'wellness',
        severity: 'good',
        titleKey: 'insight.streak_title',
        detailKey: 'insight.streak_detail',
        params: { days: streak, goal: input.goal.stepsPerDay },
        actionScreen: 'wellness',
        actionLabelKey: 'wellness.title',
      },
    ];
  }

  /*
   * ---- 11. the link between sleep and mood ----
   * Splits the logged days into "lower mood" and "better mood" and compares the
   * sleep on each side. It reports an OBSERVED PATTERN in the patient's own
   * diary — it never claims one causes the other.
   */
  private moodSleepLink(input: InsightsInput, now: Date): Insight[] {
    const moods = recentMoods(input.moods, 14, now);
    if (moods.length < 6) return [];

    const sleepByDate = new Map(input.activity.map((a) => [a.date, a.sleepHours]));
    const low: number[] = [];
    const high: number[] = [];

    for (const entry of moods) {
      const sleep = sleepByDate.get(entry.date);
      if (!sleep) continue;
      if (entry.mood <= 2) low.push(sleep);
      else if (entry.mood >= 4) high.push(sleep);
    }

    if (low.length < 3 || high.length < 3) return [];

    const lowAvg = low.reduce((sum, v) => sum + v, 0) / low.length;
    const highAvg = high.reduce((sum, v) => sum + v, 0) / high.length;
    const gap = highAvg - lowAvg;
    if (gap < 0.8) return [];

    return [
      {
        id: 'wellness-mood-sleep',
        kind: 'mood',
        severity: 'info',
        titleKey: 'insight.mood_sleep_title',
        detailKey: 'insight.mood_sleep_detail',
        params: {
          low: lowAvg.toFixed(1),
          high: highAvg.toFixed(1),
          gap: gap.toFixed(1),
        },
        actionScreen: 'wellness',
        actionLabelKey: 'wellness.title',
      },
    ];
  }

  /* ---- 12. the wellbeing score, week over week ---- */
  private wellbeingTrend(input: InsightsInput, now: Date): Insight[] {
    const score = computeWellbeingScore({
      activity: input.activity,
      moods: input.moods,
      schedules: input.schedules,
      records: input.doseRecords,
      goal: input.goal,
      now,
    });
    if (score.score === null || score.trend === null || Math.abs(score.trend) < 5) return [];

    const up = score.trend > 0;
    return [
      {
        id: 'wellbeing-trend',
        kind: 'wellness',
        severity: up ? 'good' : 'info',
        titleKey: up ? 'insight.score_up_title' : 'insight.score_down_title',
        detailKey: 'insight.score_detail',
        params: { score: score.score, change: Math.abs(score.trend) },
        actionScreen: 'wellness',
        actionLabelKey: 'wellness.title',
      },
    ];
  }
}

/* ------------------------- registry ------------------------- */

let current: InsightsEngine = new RuleBasedInsightsEngine();

export function getInsightsEngine(): InsightsEngine {
  return current;
}

/** Swap point for a trained on-device health model. */
export function setInsightsEngine(engine: InsightsEngine): void {
  current = engine;
}
