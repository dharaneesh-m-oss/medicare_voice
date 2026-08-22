import { useMemo, useState } from 'react';

import { useApp } from '../../app/AppState';
import type { TranslationKey } from '../../core/i18n';
import { buildDayView } from '../../core/scheduler/MedicationScheduler';
import type { DoseRecord } from '../../core/types';
import { formatStrength } from '../../core/types';
import { addDays, formatDateLong, formatTime12h, toISODate } from '../../core/utils/date';
import { Screen } from '../components/Screen';
import { SafetyNote, StatusBadge, type Tone } from '../components/common';

const RECORD_LABEL: Record<DoseRecord['status'], TranslationKey> = {
  taken: 'schedule.status_taken',
  not_taken: 'schedule.status_not_taken',
  snoozed: 'schedule.status_snoozed',
};

const RECORD_TONE: Record<DoseRecord['status'], Tone> = {
  taken: 'success',
  not_taken: 'danger',
  snoozed: 'warn',
};

export function HistoryScreen() {
  const { t, locale, records, scans, schedules } = useApp();
  const [tab, setTab] = useState<'doses' | 'scans'>('doses');

  /** Adherence over the last 7 days: taken / doses whose time has passed. */
  const adherence = useMemo(() => {
    const now = new Date();
    let total = 0;
    let taken = 0;
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = toISODate(addDays(now, -offset));
      for (const view of buildDayView(schedules, records, date, now)) {
        // Doses still ahead of the clock are not yet a success or a failure.
        if (view.status === 'upcoming') continue;
        total += 1;
        if (view.status === 'taken') taken += 1;
      }
    }
    return total === 0 ? null : Math.round((taken / total) * 100);
  }, [schedules, records]);

  const grouped = useMemo(() => {
    const map = new Map<string, DoseRecord[]>();
    [...records]
      .sort((a, b) => (a.date === b.date ? b.time.localeCompare(a.time) : b.date.localeCompare(a.date)))
      .forEach((record) => {
        const list = map.get(record.date) ?? [];
        list.push(record);
        map.set(record.date, list);
      });
    return [...map.entries()];
  }, [records]);

  return (
    <Screen title={t('history.title')}>
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab === 'doses'}
          onClick={() => setTab('doses')}
        >
          {t('history.tab_doses')}
        </button>
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab === 'scans'}
          onClick={() => setTab('scans')}
        >
          {t('history.tab_scans')}
        </button>
      </div>

      {tab === 'doses' && (
        <>
          {adherence !== null && (
            <div className="card card-tight">
              <span className="big-value">{t('history.adherence', { percent: adherence })}</span>
            </div>
          )}

          {grouped.length === 0 && <p className="empty">{t('history.empty_doses')}</p>}

          {grouped.map(([date, list]) => (
            <div className="stack" key={date}>
              <h2 className="section-title">{formatDateLong(date, locale)}</h2>
              {list.map((record) => (
                <div className="card card-tight" key={record.occurrenceId}>
                  <div className="row">
                    <span style={{ fontWeight: 700 }}>
                      {formatTime12h(record.time)} · {record.medicineName} {record.strengthLabel}
                    </span>
                  </div>
                  <StatusBadge tone={RECORD_TONE[record.status]}>
                    {t(RECORD_LABEL[record.status])}
                  </StatusBadge>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {tab === 'scans' && (
        <>
          {scans.length === 0 && <p className="empty">{t('history.empty_scans')}</p>}
          {scans.map((scan) => (
            <div className="card card-tight" key={scan.id}>
              <div className="row">
                <span style={{ fontWeight: 700 }}>
                  {scan.recognition.medicineName} {formatStrength(scan.recognition.strength)}
                </span>
                <StatusBadge
                  tone={
                    scan.verification.overall === 'safe'
                      ? 'success'
                      : scan.verification.overall === 'caution'
                        ? 'warn'
                        : 'danger'
                  }
                >
                  {t(
                    scan.verification.overall === 'safe'
                      ? 'result.verdict_safe'
                      : scan.verification.overall === 'caution'
                        ? 'result.verdict_caution'
                        : 'result.verdict_unsafe',
                  )}
                </StatusBadge>
              </div>
              <span className="muted">
                {new Date(scan.scannedAt).toLocaleString(locale)} ·{' '}
                {t('result.expiry')}: {scan.verification.expiry.printed ?? t('common.unknown')}
              </span>
            </div>
          ))}
        </>
      )}

      <SafetyNote />
    </Screen>
  );
}
