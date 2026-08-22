/**
 * VERIFICATION ENGINE.
 *
 * Two independent checks, combined into one verdict:
 *   1. EXPIRY   — real date arithmetic against the printed month.
 *   2. SCHEDULE — is this medicine, at this strength, on the user's plan?
 *
 * Safety rule baked in here: the engine only ever reports *what it observed* and
 * asks the user to confirm with a doctor or pharmacist. It never diagnoses,
 * never prescribes and never suggests changing a dose.
 */

import type {
  DoseRecord,
  ExpiryCheck,
  ExpiryStatus,
  MatchStatus,
  OverallVerdict,
  RecognitionResult,
  ScheduleEntry,
  ScheduleMatch,
  Strength,
  VerificationMessage,
  VerificationResult,
} from '../types';
import { formatStrength, sameStrength } from '../types';
import { endOfExpiryMonth, expiryToPrinted, printedToExpiry } from '../utils/date';
import { getNextTimeForSchedule } from '../scheduler/MedicationScheduler';

/** A pack stays usable to the end of its printed month. */
export const EXPIRING_SOON_DAYS = 30;

/* ---------------------------- expiry ---------------------------- */

export function checkExpiry(
  expiryYearMonth: string | null,
  now: Date = new Date(),
): ExpiryCheck {
  if (!expiryYearMonth) {
    return { status: 'unknown', printed: null, validUntil: null, daysRemaining: null };
  }

  const validUntil = endOfExpiryMonth(expiryYearMonth);
  if (validUntil === null) {
    return {
      status: 'unknown',
      printed: expiryToPrinted(expiryYearMonth),
      validUntil: null,
      daysRemaining: null,
    };
  }

  const daysRemaining = Math.floor((validUntil - now.getTime()) / 86_400_000);
  let status: ExpiryStatus;
  if (validUntil < now.getTime()) status = 'expired';
  else if (daysRemaining <= EXPIRING_SOON_DAYS) status = 'expiring_soon';
  else status = 'valid';

  return {
    status,
    printed: expiryToPrinted(expiryYearMonth),
    validUntil,
    daysRemaining,
  };
}

/* --------------------------- name match -------------------------- */

const NAME_NOISE = [
  'hydrochloride',
  'hcl',
  'sodium',
  'potassium',
  'calcium',
  'maleate',
  'besylate',
  'tartrate',
  'sulphate',
  'sulfate',
  'ip',
  'bp',
  'usp',
  'tablets',
  'tablet',
  'capsules',
  'capsule',
  'syrup',
  'suspension',
];

export function normaliseName(name: string): string {
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !NAME_NOISE.includes(t));
  return tokens.join(' ');
}

export function namesMatch(a: string, b: string): boolean {
  const na = normaliseName(a);
  const nb = normaliseName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Salt/brand variations: agree if the leading token is the same molecule.
  return na.split(' ')[0] === nb.split(' ')[0];
}

/* ------------------------ schedule matching ---------------------- */

export function matchAgainstSchedule(
  detectedName: string,
  detectedStrength: Strength | null,
  schedules: ScheduleEntry[],
  records: DoseRecord[],
  now: Date = new Date(),
): ScheduleMatch {
  const detected = {
    detectedName,
    detectedStrengthLabel: formatStrength(detectedStrength),
  };

  const active = schedules.filter((s) => s.active);
  if (active.length === 0) {
    return {
      status: 'no_schedule_data',
      matchedScheduleId: null,
      expectedName: null,
      expectedStrengthLabel: null,
      nextTime: null,
      ...detected,
    };
  }

  const byName = active.filter((s) => namesMatch(s.medicineName, detectedName));
  if (byName.length === 0) {
    return {
      status: 'not_in_schedule',
      matchedScheduleId: null,
      expectedName: null,
      expectedStrengthLabel: null,
      nextTime: null,
      ...detected,
    };
  }

  const exact = byName.find((s) => sameStrength(s.strength, detectedStrength));
  if (exact) {
    return {
      status: 'match',
      matchedScheduleId: exact.id,
      expectedName: exact.medicineName,
      expectedStrengthLabel: formatStrength(exact.strength),
      nextTime: getNextTimeForSchedule(exact, records, now),
      ...detected,
    };
  }

  const expected = byName[0];
  return {
    status: 'strength_mismatch',
    matchedScheduleId: expected.id,
    expectedName: expected.medicineName,
    expectedStrengthLabel: formatStrength(expected.strength),
    nextTime: getNextTimeForSchedule(expected, records, now),
    ...detected,
  };
}

/* --------------------------- full verify -------------------------- */

export interface VerifyInput {
  recognition: RecognitionResult;
  /** "MM/YYYY" straight from OCR, or null when unreadable. */
  printedExpiry: string | null | undefined;
  schedules: ScheduleEntry[];
  records: DoseRecord[];
  confidenceThreshold: number;
  now?: Date;
}

const WORSE: Record<OverallVerdict, number> = { safe: 0, caution: 1, unsafe: 2 };

function worst(a: OverallVerdict, b: OverallVerdict): OverallVerdict {
  return WORSE[a] >= WORSE[b] ? a : b;
}

export function verify(input: VerifyInput): VerificationResult {
  const now = input.now ?? new Date();
  const expiry = checkExpiry(printedToExpiry(input.printedExpiry), now);
  const match = matchAgainstSchedule(
    input.recognition.medicineName,
    input.recognition.strength,
    input.schedules,
    input.records,
    now,
  );

  const messages: VerificationMessage[] = [];
  let overall: OverallVerdict = 'safe';

  /* expiry messages */
  switch (expiry.status) {
    case 'expired':
      messages.push({
        key: 'verify.expired',
        params: { date: expiry.printed ?? '' },
        tone: 'danger',
      });
      overall = worst(overall, 'unsafe');
      break;
    case 'expiring_soon':
      messages.push({
        key: 'verify.expiring_soon',
        params: { date: expiry.printed ?? '', days: expiry.daysRemaining ?? 0 },
        tone: 'warn',
      });
      overall = worst(overall, 'caution');
      break;
    case 'valid':
      messages.push({
        key: 'verify.valid_expiry',
        params: { date: expiry.printed ?? '' },
        tone: 'success',
      });
      break;
    default:
      messages.push({ key: 'verify.expiry_unknown', tone: 'warn' });
      overall = worst(overall, 'caution');
  }

  /* schedule messages */
  const m: MatchStatus = match.status;
  if (m === 'match') {
    messages.push({
      key: 'verify.schedule_match',
      params: {
        name: match.expectedName ?? '',
        strength: match.expectedStrengthLabel ?? '',
      },
      tone: 'success',
    });
  } else if (m === 'strength_mismatch') {
    messages.push({
      key: 'verify.strength_mismatch',
      params: {
        expected: `${match.expectedName} ${match.expectedStrengthLabel}`,
        detected: `${match.detectedName} ${match.detectedStrengthLabel}`,
      },
      tone: 'danger',
    });
    overall = worst(overall, 'unsafe');
  } else if (m === 'not_in_schedule') {
    messages.push({
      key: 'verify.not_in_schedule',
      params: { name: match.detectedName },
      tone: 'danger',
    });
    overall = worst(overall, 'unsafe');
  } else {
    messages.push({ key: 'verify.no_schedule_data', tone: 'info' });
    overall = worst(overall, 'caution');
  }

  /* recognition confidence */
  if (input.recognition.confidence < input.confidenceThreshold) {
    messages.push({
      key: 'verify.low_confidence',
      params: { percent: Math.round(input.recognition.confidence * 100) },
      tone: 'warn',
    });
    overall = worst(overall, 'caution');
  }

  if (overall !== 'safe') {
    messages.push({ key: 'safety.ask_doctor', tone: 'info' });
  }

  return { expiry, match, overall, messages, checkedAt: now.toISOString() };
}
