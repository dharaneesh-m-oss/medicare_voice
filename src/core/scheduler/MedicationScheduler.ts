/**
 * MEDICATION SCHEDULER.
 *
 * Turns stored `ScheduleEntry` rows into concrete dose slots for a given day and
 * decides, against the clock and the stored outcomes, what is upcoming, due,
 * missed or already handled. No React, no storage, no I/O — pure functions, so
 * this is the easiest part of the app to port to Kotlin later.
 */

import type {
  DoseOccurrence,
  DoseRecord,
  DoseStatus,
  ScheduleEntry,
} from '../types';
import {
  addDays,
  daysBetween,
  fromISODate,
  timestampFor,
  toISODate,
} from '../utils/date';

/** A dose is "due" from its scheduled minute until this many minutes later. */
export const MISSED_AFTER_MIN = 60;
/** Overdue doses older than this are no longer popped as reminders. */
export const REMINDER_BACKLOG_MIN = 180;

export function occursOn(entry: ScheduleEntry, isoDate: string): boolean {
  if (!entry.active) return false;
  if (entry.frequency === 'as_needed') return false;

  const date = fromISODate(isoDate);
  const start = fromISODate(entry.startDate);
  if (daysBetween(start, date) < 0) return false;

  switch (entry.frequency) {
    case 'every_other_day':
      return daysBetween(start, date) % 2 === 0;
    case 'weekly':
      return date.getDay() === (entry.weekday ?? start.getDay());
    default:
      return true;
  }
}

export function getOccurrencesForDate(
  entries: ScheduleEntry[],
  isoDate: string,
): DoseOccurrence[] {
  const out: DoseOccurrence[] = [];
  for (const entry of entries) {
    if (!occursOn(entry, isoDate)) continue;
    for (const time of entry.times) {
      out.push({
        id: `${entry.id}@${isoDate}@${time}`,
        scheduleId: entry.id,
        medicineName: entry.medicineName,
        strength: entry.strength,
        form: entry.form,
        notes: entry.notes,
        date: isoDate,
        time,
        timestamp: timestampFor(isoDate, time),
      });
    }
  }
  return out.sort((a, b) => a.timestamp - b.timestamp);
}

export function indexRecords(records: DoseRecord[]): Map<string, DoseRecord> {
  const map = new Map<string, DoseRecord>();
  for (const r of records) map.set(r.occurrenceId, r);
  return map;
}

export function resolveStatus(
  occurrence: DoseOccurrence,
  records: Map<string, DoseRecord>,
  now: Date = new Date(),
): DoseStatus {
  const record = records.get(occurrence.id);
  const nowMs = now.getTime();

  if (record) {
    if (record.status === 'taken') return 'taken';
    if (record.status === 'not_taken') return 'not_taken';
    if (record.status === 'snoozed') {
      // Snooze elapsed -> the dose is asking for attention again.
      if (record.snoozeUntil && nowMs >= record.snoozeUntil) return 'due';
      return 'snoozed';
    }
  }

  const dueFrom = occurrence.timestamp;
  const dueUntil = dueFrom + MISSED_AFTER_MIN * 60_000;
  if (nowMs < dueFrom) return 'upcoming';
  if (nowMs <= dueUntil) return 'due';
  return 'missed';
}

export interface OccurrenceView extends DoseOccurrence {
  status: DoseStatus;
  record?: DoseRecord;
}

export function buildDayView(
  entries: ScheduleEntry[],
  records: DoseRecord[],
  isoDate: string,
  now: Date = new Date(),
): OccurrenceView[] {
  const index = indexRecords(records);
  return getOccurrencesForDate(entries, isoDate).map((occ) => ({
    ...occ,
    status: resolveStatus(occ, index, now),
    record: index.get(occ.id),
  }));
}

/** The next dose still to come — today, else tomorrow. */
export function getNextDose(
  entries: ScheduleEntry[],
  records: DoseRecord[],
  now: Date = new Date(),
): OccurrenceView | null {
  const today = buildDayView(entries, records, toISODate(now), now);
  const upcoming = today.find(
    (o) => o.status === 'upcoming' || o.status === 'due' || o.status === 'snoozed',
  );
  if (upcoming) return upcoming;

  const tomorrow = buildDayView(entries, records, toISODate(addDays(now, 1)), now);
  return tomorrow[0] ?? null;
}

/** The next dose for one specific schedule entry (used by the scan result screen). */
export function getNextTimeForSchedule(
  entry: ScheduleEntry,
  records: DoseRecord[],
  now: Date = new Date(),
): string | null {
  const today = buildDayView([entry], records, toISODate(now), now);
  const next = today.find((o) => o.status === 'upcoming' || o.status === 'due');
  if (next) return next.time;
  const tomorrow = buildDayView([entry], records, toISODate(addDays(now, 1)), now);
  return tomorrow[0]?.time ?? null;
}

/**
 * Doses that should raise a reminder right now: due, or overdue by less than
 * REMINDER_BACKLOG_MIN, with no outcome recorded yet.
 */
export function getPendingReminders(
  entries: ScheduleEntry[],
  records: DoseRecord[],
  now: Date = new Date(),
): OccurrenceView[] {
  const nowMs = now.getTime();
  return buildDayView(entries, records, toISODate(now), now).filter((o) => {
    if (o.status === 'due') return true;
    if (o.status === 'missed' && !o.record) {
      return nowMs - o.timestamp <= REMINDER_BACKLOG_MIN * 60_000;
    }
    return false;
  });
}

export interface DaySummary {
  total: number;
  taken: number;
  missed: number;
  remaining: number;
}

export function summariseDay(views: OccurrenceView[]): DaySummary {
  return {
    total: views.length,
    taken: views.filter((v) => v.status === 'taken').length,
    missed: views.filter((v) => v.status === 'missed' || v.status === 'not_taken').length,
    remaining: views.filter(
      (v) => v.status === 'upcoming' || v.status === 'due' || v.status === 'snoozed',
    ).length,
  };
}

/** Sensible default clock times when a caregiver picks a frequency. */
export function defaultTimesFor(count: number): string[] {
  switch (count) {
    case 1:
      return ['08:00'];
    case 2:
      return ['08:00', '20:00'];
    case 3:
      return ['08:00', '13:00', '20:00'];
    default:
      return [];
  }
}

/**
 * Share of due doses that were marked taken over the last `days` days.
 * Doses still ahead of the clock are excluded — they are not yet a miss.
 */
export function adherenceRate(
  entries: ScheduleEntry[],
  records: DoseRecord[],
  days = 14,
  now: Date = new Date(),
): { taken: number; total: number; percent: number } | null {
  let total = 0;
  let taken = 0;
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = toISODate(addDays(now, -offset));
    for (const view of buildDayView(entries, records, date, now)) {
      if (view.status === 'upcoming') continue;
      total += 1;
      if (view.status === 'taken') taken += 1;
    }
  }
  if (total === 0) return null;
  return { taken, total, percent: Math.round((taken / total) * 100) };
}
