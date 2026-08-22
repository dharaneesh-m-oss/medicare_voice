import { useEffect, useMemo, useState } from 'react';

import { useApp } from '../../app/AppState';
import { useNavigator } from '../../app/Navigator';
import type { TranslationKey } from '../../core/i18n';
import { buildDayView, summariseDay } from '../../core/scheduler/MedicationScheduler';
import type { DoseStatus } from '../../core/types';
import { formatStrength } from '../../core/types';
import { formatDateLong, formatTime12h, toISODate } from '../../core/utils/date';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { SafetyNote, SpeakButton, StatusBadge, type Tone } from '../components/common';

const STATUS_LABEL: Record<DoseStatus, TranslationKey> = {
  taken: 'schedule.status_taken',
  not_taken: 'schedule.status_not_taken',
  snoozed: 'schedule.status_snoozed',
  due: 'schedule.status_due',
  missed: 'schedule.status_missed',
  upcoming: 'schedule.status_upcoming',
};

const STATUS_TONE: Record<DoseStatus, Tone> = {
  taken: 'success',
  not_taken: 'danger',
  snoozed: 'warn',
  due: 'info',
  missed: 'danger',
  upcoming: 'info',
};

export function ScheduleScreen() {
  const { t, locale, schedules, records, recordDose, clearDose } = useApp();
  const { navigate } = useNavigator();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const today = toISODate(now);
  const views = useMemo(
    () => buildDayView(schedules, records, today, now),
    [schedules, records, today, now],
  );
  const summary = summariseDay(views);

  const spoken =
    views.length === 0
      ? t('schedule.empty')
      : views
          .map(
            (view) =>
              `${formatTime12h(view.time)} ${view.medicineName} ${formatStrength(view.strength)}`,
          )
          .join('. ');

  return (
    <Screen title={t('schedule.title')} action={<SpeakButton text={spoken} compact />}>
      <div className="card card-tight">
        <span className="muted">{formatDateLong(today, locale)}</span>
        <span style={{ fontWeight: 700 }}>
          {t('schedule.summary', {
            taken: summary.taken,
            remaining: summary.remaining,
            missed: summary.missed,
          })}
        </span>
      </div>

      {views.length === 0 && <p className="empty">{t('schedule.empty')}</p>}

      {views.map((view) => {
        const cls =
          view.status === 'taken'
            ? 'dose dose-taken'
            : view.status === 'due'
              ? 'dose dose-due'
              : view.status === 'missed' || view.status === 'not_taken'
                ? 'dose dose-missed'
                : 'dose';
        return (
          <div className={cls} key={view.id}>
            <div className="dose-time">{formatTime12h(view.time)}</div>
            <div className="dose-body">
              <span className="dose-name">
                {view.medicineName} {formatStrength(view.strength)}
              </span>
              {view.notes && <span className="muted">{view.notes}</span>}
              <StatusBadge tone={STATUS_TONE[view.status]}>
                {t(STATUS_LABEL[view.status])}
              </StatusBadge>

              {view.status === 'taken' || view.status === 'not_taken' ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ minHeight: 52 }}
                  onClick={() => clearDose(view.id)}
                >
                  {t('schedule.undo')}
                </button>
              ) : (
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => recordDose(view, 'taken')}
                  >
                    <Icon name="check" size={24} />
                    {t('schedule.take')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => recordDose(view, 'not_taken')}
                  >
                    {t('schedule.mark_not_taken')}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button type="button" className="btn btn-secondary" onClick={() => navigate('add')}>
        <Icon name="plus" size={26} />
        {t('schedule.add')}
      </button>

      <SafetyNote />
    </Screen>
  );
}
