/**
 * Wellness, fitness and mental-wellbeing tracking.
 *
 * Everything here is SELF-REPORTED and non-clinical. The app tracks, averages
 * and shows trends. It does not screen for, score or name any condition.
 */

export interface ActivityLog {
  id: string;
  patientId: string;
  /** "YYYY-MM-DD" — one row per day. */
  date: string;
  steps: number;
  activeMinutes: number;
  sleepHours: number;
  waterGlasses: number;
  updatedAt: string;
}

/** 1 = very low … 5 = very good. Plain self-report, not a clinical scale. */
export type FivePoint = 1 | 2 | 3 | 4 | 5;

export interface MoodEntry {
  id: string;
  patientId: string;
  date: string;
  mood: FivePoint;
  /** 1 = very calm … 5 = very stressed */
  stress: FivePoint;
  sleepQuality: FivePoint;
  note: string;
  createdAt: string;
}

export interface WellnessGoal {
  patientId: string;
  stepsPerDay: number;
  sleepHoursPerNight: number;
  waterGlassesPerDay: number;
  activeMinutesPerDay: number;
}

export const DEFAULT_WELLNESS_GOAL: Omit<WellnessGoal, 'patientId'> = {
  stepsPerDay: 4000,
  sleepHoursPerNight: 7,
  waterGlassesPerDay: 8,
  activeMinutesPerDay: 20,
};

/**
 * Support line shown alongside low-mood trends.
 * Tele-MANAS is India's national mental-health support line.
 * VERIFY this number for the deployment region before release.
 */
export const SUPPORT_LINE = {
  name: 'Tele-MANAS',
  number: '14416',
  region: 'India',
};
