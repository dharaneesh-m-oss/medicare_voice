/**
 * REMINDER SYSTEM.
 *
 * A 15-second tick asks the scheduler which doses are due or freshly overdue and
 * raises the reminder overlay. Outcomes (Taken / Not Taken / Remind me later)
 * are written to local storage through the app reducer.
 *
 * On Android this tick is replaced by AlarmManager + a notification channel; the
 * decision logic in `MedicationScheduler.getPendingReminders()` stays the same.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getPendingReminders,
  type OccurrenceView,
} from '../core/scheduler/MedicationScheduler';
import { useApp } from './AppState';

const TICK_MS = 15_000;

interface RemindersValue {
  active: OccurrenceView | null;
  /** true when the active reminder is already past its due window */
  overdue: boolean;
  markTaken: () => void;
  markNotTaken: () => void;
  remindLater: () => void;
  dismiss: () => void;
  /** Demo Mode: raise the reminder for a specific dose immediately. */
  forceReminder: (occurrence: OccurrenceView) => void;
}

const RemindersContext = createContext<RemindersValue | null>(null);

export function RemindersProvider({ children }: { children: ReactNode }) {
  const { schedules, records, settings, recordDose } = useApp();
  const [now, setNow] = useState(() => new Date());
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [forced, setForced] = useState<OccurrenceView | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const pending = useMemo(() => {
    if (!settings.remindersEnabled) return [];
    return getPendingReminders(schedules, records, now);
  }, [schedules, records, settings.remindersEnabled, now]);

  const active = useMemo(() => {
    if (forced) return forced;
    return pending.find((p) => !dismissed.includes(p.id)) ?? null;
  }, [forced, pending, dismissed]);

  const finish = useCallback(
    (status: 'taken' | 'not_taken' | 'snoozed') => {
      if (!active) return;
      recordDose(active, status, settings.snoozeMinutes);
      setForced(null);
      setDismissed((prev) => (prev.includes(active.id) ? prev : [...prev, active.id]));
    },
    [active, recordDose, settings.snoozeMinutes],
  );

  const value = useMemo<RemindersValue>(
    () => ({
      active,
      overdue: active ? active.timestamp + 60 * 60_000 < now.getTime() : false,
      markTaken: () => finish('taken'),
      markNotTaken: () => finish('not_taken'),
      remindLater: () => finish('snoozed'),
      dismiss: () => {
        if (active) setDismissed((prev) => [...prev, active.id]);
        setForced(null);
      },
      forceReminder: (occurrence) => {
        setDismissed((prev) => prev.filter((id) => id !== occurrence.id));
        setForced(occurrence);
      },
    }),
    [active, finish, now],
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersValue {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error('useReminders must be used inside <RemindersProvider>');
  return ctx;
}
