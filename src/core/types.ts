/**
 * MediCare Voice — shared domain models.
 *
 * This file is the contract between every layer of the app. It must stay free of
 * React, DOM and storage concerns.
 */

/* ------------------------------------------------------------------ */
/* Basic medicine vocabulary                                           */
/* ------------------------------------------------------------------ */

export type StrengthUnit = 'mg' | 'mcg' | 'g' | 'ml' | 'IU' | '%';

export interface Strength {
  value: number;
  unit: StrengthUnit;
}

export type DosageForm =
  | 'tablet'
  | 'capsule'
  | 'syrup'
  | 'injection'
  | 'drops'
  | 'inhaler'
  | 'ointment'
  | 'unknown';

/** An item physically present in the patient's medicine cabinet. */
export interface Medicine {
  id: string;
  patientId: string;
  name: string;
  strength: Strength | null;
  form: DosageForm;
  /** "YYYY-MM" — packs print month precision only. */
  expiry: string | null;
  batchNumber?: string | null;
  notes?: string;
  addedAt: string;
  /** true when the entry was created from a scan rather than typed in. */
  fromScan?: boolean;
  /** Units left in the pack, when the patient recorded it — drives refill forecasts. */
  unitsLeft?: number | null;
  /** Units per dose, default 1. */
  unitsPerDose?: number;
}

/* ------------------------------------------------------------------ */
/* Scheduling                                                          */
/* ------------------------------------------------------------------ */

export type Frequency =
  | 'once_daily'
  | 'twice_daily'
  | 'thrice_daily'
  | 'every_other_day'
  | 'weekly'
  | 'as_needed';

/** How many clock times a frequency needs. */
export const TIMES_PER_FREQUENCY: Record<Frequency, number> = {
  once_daily: 1,
  twice_daily: 2,
  thrice_daily: 3,
  every_other_day: 1,
  weekly: 1,
  as_needed: 0,
};

/** One prescription line as entered by the patient, caregiver or doctor. */
export interface ScheduleEntry {
  id: string;
  patientId: string;
  medicineName: string;
  strength: Strength | null;
  form: DosageForm;
  frequency: Frequency;
  /** 24h "HH:MM", sorted ascending. */
  times: string[];
  /** "YYYY-MM-DD" — parity anchor for every_other_day. */
  startDate: string;
  /** 0 = Sunday … 6 = Saturday, only used by `weekly`. */
  weekday?: number | null;
  notes?: string;
  active: boolean;
  createdAt: string;
  /** Set when a doctor's prescription created this line. */
  prescriptionId?: string | null;
}

/** A concrete dose slot. Computed on the fly — never persisted. */
export interface DoseOccurrence {
  /** `${scheduleId}@${date}@${time}` */
  id: string;
  scheduleId: string;
  medicineName: string;
  strength: Strength | null;
  form: DosageForm;
  notes?: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  time: string;
  /** epoch ms of the scheduled moment */
  timestamp: number;
}

export type DoseAction = 'taken' | 'not_taken' | 'snoozed';

/** The persisted outcome of a dose occurrence. */
export interface DoseRecord {
  occurrenceId: string;
  patientId: string;
  scheduleId: string;
  medicineName: string;
  strengthLabel: string;
  date: string;
  time: string;
  status: DoseAction;
  recordedAt: string;
  /** epoch ms; only for `snoozed`. */
  snoozeUntil?: number;
}

/** Status shown in the UI — merges stored records with the clock. */
export type DoseStatus =
  | 'taken'
  | 'not_taken'
  | 'snoozed'
  | 'due'
  | 'missed'
  | 'upcoming';

/* ------------------------------------------------------------------ */
/* Recognition + OCR                                                   */
/* ------------------------------------------------------------------ */

export interface RecognitionCandidate {
  medicineName: string;
  confidence: number;
}

export interface RecognitionResult {
  medicineName: string;
  strength: Strength | null;
  dosageForm: DosageForm;
  /** 0..1 */
  confidence: number;
  candidates: RecognitionCandidate[];
  /** engine id, e.g. "mock-recognition-v1" */
  engine: string;
  engineLabel: string;
  isSimulated: boolean;
  /** Sample pack id when the demo engine produced this result. */
  referenceId?: string;
  /**
   * Text the demo engine believes is printed on the pack. In the real pipeline
   * this comes from the camera frame, not from the classifier.
   */
  simulatedPackText?: string[];
  processingMs: number;
}

export interface OcrLine {
  text: string;
  confidence: number;
}

export interface OcrFields {
  medicineName?: string;
  strengthText?: string;
  /** normalised "MM/YYYY" */
  expiry?: string;
  batch?: string;
  mfg?: string;
}

export interface OcrResult {
  lines: OcrLine[];
  fullText: string;
  fields: OcrFields;
  engine: string;
  engineLabel: string;
  isSimulated: boolean;
  processingMs: number;
}

/* ------------------------------------------------------------------ */
/* Verification                                                        */
/* ------------------------------------------------------------------ */

export type ExpiryStatus = 'valid' | 'expiring_soon' | 'expired' | 'unknown';

export type MatchStatus =
  | 'match'
  | 'strength_mismatch'
  | 'not_in_schedule'
  | 'no_schedule_data';

export type OverallVerdict = 'safe' | 'caution' | 'unsafe';

export interface ExpiryCheck {
  status: ExpiryStatus;
  /** "MM/YYYY" as printed */
  printed: string | null;
  /** last valid instant of that month, epoch ms */
  validUntil: number | null;
  daysRemaining: number | null;
}

export interface ScheduleMatch {
  status: MatchStatus;
  matchedScheduleId: string | null;
  expectedName: string | null;
  expectedStrengthLabel: string | null;
  detectedName: string;
  detectedStrengthLabel: string;
  /** "HH:MM" of the next dose for the matched schedule, if any. */
  nextTime: string | null;
}

/** A translatable message: key + interpolation params. */
export interface VerificationMessage {
  key: string;
  params?: Record<string, string | number>;
  tone: 'info' | 'warn' | 'danger' | 'success';
}

export interface VerificationResult {
  expiry: ExpiryCheck;
  match: ScheduleMatch;
  overall: OverallVerdict;
  messages: VerificationMessage[];
  checkedAt: string;
}

/* ------------------------------------------------------------------ */
/* Scan                                                                */
/* ------------------------------------------------------------------ */

export interface ScanResult {
  id: string;
  patientId: string;
  imageDataUrl: string | null;
  recognition: RecognitionResult;
  ocr: OcrResult;
  verification: VerificationResult;
  scannedAt: string;
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export type LanguageCode = 'en' | 'ta' | 'hi';

export type ThemeName = 'dark' | 'light';

export interface Settings {
  language: LanguageCode;
  /** Light is the default; dark is offered for anyone who prefers it. */
  theme: ThemeName;
  /** 1 = 20px base, 1.3 = 26px base */
  textScale: number;
  highContrast: boolean;
  voiceEnabled: boolean;
  autoSpeakResults: boolean;
  remindersEnabled: boolean;
  /** minutes added by "Remind me later" */
  snoozeMinutes: number;
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  theme: 'light',
  textScale: 1,
  highContrast: false,
  voiceEnabled: true,
  autoSpeakResults: true,
  remindersEnabled: true,
  snoozeMinutes: 10,
};

/* ------------------------------------------------------------------ */
/* Helpers used across layers                                          */
/* ------------------------------------------------------------------ */

export function formatStrength(strength: Strength | null): string {
  if (!strength) return '—';
  const value = Number.isInteger(strength.value)
    ? String(strength.value)
    : String(strength.value);
  return `${value} ${strength.unit}`;
}

export function sameStrength(a: Strength | null, b: Strength | null): boolean {
  if (!a || !b) return false;
  const norm = (s: Strength) => {
    if (s.unit === 'g') return { value: s.value * 1000, unit: 'mg' };
    if (s.unit === 'mcg') return { value: s.value / 1000, unit: 'mg' };
    return { value: s.value, unit: s.unit };
  };
  const na = norm(a);
  const nb = norm(b);
  return na.unit === nb.unit && Math.abs(na.value - nb.value) < 1e-6;
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
