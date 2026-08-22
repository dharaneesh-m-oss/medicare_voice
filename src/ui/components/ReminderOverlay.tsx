import { useEffect, useRef } from 'react';

import { useApp } from '../../app/AppState';
import { useReminders } from '../../app/Reminders';
import { useSpeech } from '../../app/useSpeech';
import { formatStrength } from '../../core/types';
import { formatTime12h } from '../../core/utils/date';
import { Icon } from './Icon';

/**
 * The reminder the whole product exists for. Three unambiguous choices, each
 * stored locally so the schedule and history stay truthful.
 */
export function ReminderOverlay() {
  const { t, settings } = useApp();
  const { active, overdue, markTaken, markNotTaken, remindLater } = useReminders();
  const { speak } = useSpeech();
  const spokenFor = useRef<string | null>(null);

  useEffect(() => {
    if (!active || spokenFor.current === active.id) return;
    spokenFor.current = active.id;
    speak(
      `${t('reminder.body')} ${active.medicineName} ${formatStrength(active.strength)}, ${formatTime12h(
        active.time,
      )}.`,
    );
  }, [active, speak, t]);

  if (!active) return null;

  return (
    <div className="overlay" role="alertdialog" aria-modal="true" aria-label={t('reminder.title')}>
      <div className="modal">
        <div className="row">
          <h2 className="modal-title">{t('reminder.title')}</h2>
          <Icon name="clock" size={34} />
        </div>

        <p style={{ margin: 0, fontSize: '1.05em' }}>{t('reminder.body')}</p>

        <div className="card card-flat card-tight">
          <span className="big-value">
            {active.medicineName} {formatStrength(active.strength)}
          </span>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
            {formatTime12h(active.time)}
          </span>
          {active.notes && <span className="muted">{active.notes}</span>}
          {overdue && (
            <span className="badge badge-warn">
              {t('reminder.overdue', { time: formatTime12h(active.time) })}
            </span>
          )}
        </div>

        <button type="button" className="btn btn-lg btn-success" onClick={markTaken}>
          <Icon name="check" size={28} />
          {t('reminder.taken')}
        </button>
        <button type="button" className="btn btn-danger" onClick={markNotTaken}>
          {t('reminder.not_taken')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={remindLater}>
          {t('reminder.later')} · {t('settings.minutes', { count: settings.snoozeMinutes })}
        </button>

        <p className="footnote">{t('safety.ask_doctor')}</p>
      </div>
    </div>
  );
}
