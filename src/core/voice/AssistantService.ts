/**
 * ASSISTANT SERVICE.
 *
 * Turns a matched intent into an answer built from the user's REAL data — the
 * last scan, the saved schedule, today's dose records. It never invents medical
 * content: every sentence is a translation template filled with stored values.
 */

import type { Translator } from '../i18n';
import { buildDayView, getNextDose, summariseDay } from '../scheduler/MedicationScheduler';
import type { DoseRecord, ScanResult, ScheduleEntry } from '../types';
import { formatStrength } from '../types';
import { formatTime12h, toISODate } from '../utils/date';
import { matchIntent, type Intent, type IntentName } from './IntentEngine';
import type { LanguageCode } from '../types';

export type AssistantAction = 'open_scan' | 'open_schedule' | 'open_result';

export interface AssistantContext {
  language: LanguageCode;
  t: Translator;
  lastScan: ScanResult | null;
  schedules: ScheduleEntry[];
  records: DoseRecord[];
  now?: Date;
}

export interface AssistantReply {
  intent: IntentName;
  intentConfidence: number;
  /** Spoken and displayed. */
  text: string;
  action?: AssistantAction;
}

function formName(t: Translator, form: string): string {
  const key = `form.${form}` as Parameters<Translator>[0];
  return t(key).toLowerCase();
}

export function answerIntent(intent: Intent, ctx: AssistantContext): AssistantReply {
  const { t } = ctx;
  const now = ctx.now ?? new Date();
  const base = { intent: intent.name, intentConfidence: intent.confidence };

  switch (intent.name) {
    /* ---------------- what medicine is this ---------------- */
    case 'identify_medicine': {
      const scan = ctx.lastScan;
      if (!scan) return { ...base, text: t('assistant.no_scan'), action: 'open_scan' };

      const match = scan.verification.match;
      const schedulePart =
        match.status === 'match' && match.nextTime
          ? t('assistant.identify_scheduled', { time: formatTime12h(match.nextTime) })
          : t('assistant.identify_not_scheduled');

      let text = t('assistant.identify', {
        name: scan.recognition.medicineName,
        strength: formatStrength(scan.recognition.strength),
        form: formName(t, scan.recognition.dosageForm),
        schedule: schedulePart,
      });

      if (scan.verification.expiry.status === 'expired') {
        text += ' ' + t('verify.expired', { date: scan.verification.expiry.printed ?? '' });
        text += ' ' + t('safety.ask_doctor');
      }
      return { ...base, text, action: 'open_result' };
    }

    /* ---------------- has it expired ---------------- */
    case 'check_expiry': {
      const scan = ctx.lastScan;
      if (!scan) return { ...base, text: t('assistant.no_scan'), action: 'open_scan' };

      const { expiry } = scan.verification;
      const name = scan.recognition.medicineName;
      if (expiry.status === 'expired') {
        return {
          ...base,
          text: t('assistant.expiry_expired', { name, date: expiry.printed ?? '' }),
          action: 'open_result',
        };
      }
      if (expiry.status === 'unknown') {
        return { ...base, text: t('assistant.expiry_unknown'), action: 'open_result' };
      }
      return {
        ...base,
        text: t('assistant.expiry_valid', { name, date: expiry.printed ?? '' }),
        action: 'open_result',
      };
    }

    /* ---------------- when is my next medicine ---------------- */
    case 'next_medicine': {
      const next = getNextDose(ctx.schedules, ctx.records, now);
      if (!next) return { ...base, text: t('assistant.next_dose_none') };
      return {
        ...base,
        text: t('assistant.next_dose', {
          name: next.medicineName,
          strength: formatStrength(next.strength),
          time: formatTime12h(next.time),
        }),
        action: 'open_schedule',
      };
    }

    /* ---------------- show today's medicines ---------------- */
    case 'today_medicines': {
      const views = buildDayView(ctx.schedules, ctx.records, toISODate(now), now);
      if (views.length === 0) return { ...base, text: t('assistant.today_empty') };
      const list = views
        .map(
          (v) =>
            `${v.medicineName} ${formatStrength(v.strength)} — ${formatTime12h(v.time)}`,
        )
        .join(', ');
      return {
        ...base,
        text: t('assistant.today_list', { count: views.length, list }),
        action: 'open_schedule',
      };
    }

    /* ---------------- have I taken my medicine ---------------- */
    case 'taken_status': {
      const views = buildDayView(ctx.schedules, ctx.records, toISODate(now), now);
      if (views.length === 0) return { ...base, text: t('assistant.today_empty') };
      const summary = summariseDay(views);
      const pendingList = views
        .filter((v) => v.status !== 'taken')
        .map((v) => `${v.medicineName} — ${formatTime12h(v.time)}`)
        .join(', ');
      const pending =
        summary.taken === summary.total
          ? t('assistant.taken_all')
          : t('assistant.taken_pending', { list: pendingList });
      return {
        ...base,
        text: t('assistant.taken_status', {
          taken: summary.taken,
          total: summary.total,
          pending,
        }),
        action: 'open_schedule',
      };
    }

    case 'open_scan':
      return { ...base, text: t('assistant.opening_scan'), action: 'open_scan' };

    case 'help':
      return { ...base, text: t('assistant.help') };

    default:
      return { ...base, text: t('assistant.unknown') };
  }
}

/** Convenience: transcript in, spoken answer out. */
export function ask(transcript: string, ctx: AssistantContext): AssistantReply {
  return answerIntent(matchIntent(transcript, ctx.language), ctx);
}
