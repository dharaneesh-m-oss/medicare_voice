/** Date/time helpers. Everything is local-time, because medication is local-time. */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d.getTime());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** "HH:MM" -> minutes since midnight. Returns null for malformed input. */
export function timeToMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function minutesToTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Combine an ISO date and "HH:MM" into an epoch timestamp. */
export function timestampFor(isoDate: string, time: string): number {
  const base = fromISODate(isoDate);
  const mins = timeToMinutes(time) ?? 0;
  base.setMinutes(mins);
  return base.getTime();
}

/** 08:00 -> "8:00 AM". Large, unambiguous format for elderly users. */
export function formatTime12h(time: string): string {
  const mins = timeToMinutes(time);
  if (mins === null) return time;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "YYYY-MM" -> "MM/YYYY" as printed on a pack. */
export function expiryToPrinted(expiry: string | null): string | null {
  if (!expiry) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(expiry);
  if (!m) return expiry;
  return `${m[2]}/${m[1]}`;
}

/** "MM/YYYY" (or "MM-YY", "MM.YYYY") -> "YYYY-MM". */
export function printedToExpiry(printed: string | null | undefined): string | null {
  if (!printed) return null;
  const m = /^(\d{1,2})\s*[/\-.]\s*(\d{2}|\d{4})$/.exec(printed.trim());
  if (!m) return null;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return null;
  let year = Number(m[2]);
  if (year < 100) year += 2000;
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Last millisecond of the printed expiry month — packs are valid all month. */
export function endOfExpiryMonth(expiry: string): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec(expiry);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  // day 0 of next month = last day of this month
  return new Date(year, month, 0, 23, 59, 59, 999).getTime();
}

export function formatDateLong(iso: string, locale = 'en-IN'): string {
  try {
    return fromISODate(iso).toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
