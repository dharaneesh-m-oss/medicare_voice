import { useMemo, useState } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import {
  pastForPatient,
  upcomingForPatient,
} from '../../../core/clinic/AppointmentService';
import type { Appointment } from '../../../core/clinic/types';
import type { TranslationKey } from '../../../core/i18n';
import { addDays, formatDateLong, formatTime12h, toISODate } from '../../../core/utils/date';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { SafetyNote } from '../../components/common';
import {
  Chip,
  EmptyState,
  Panel,
  RowItem,
  Segmented,
  Toast,
  useToast,
  type ChipTone,
} from '../../components/kit';

export const STATUS_TONE: Record<Appointment['status'], ChipTone> = {
  requested: 'warn',
  confirmed: 'primary',
  checked_in: 'violet',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'danger',
};

export function AppointmentsScreen() {
  const { t, locale, db, session, appointments, setAppointmentStatus } = useApp();
  const { navigate } = useNavigator();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [toast, showToast] = useToast();

  const now = new Date();
  // `now` is intentionally re-read inside each memo: a Date in the dependency
  // array would change on every render and defeat the memo entirely.
  const upcoming = useMemo(
    () => upcomingForPatient(appointments, session?.patientId ?? null, new Date()),
    [appointments, session?.patientId],
  );
  const past = useMemo(
    () => pastForPatient(appointments, session?.patientId ?? null, new Date()),
    [appointments, session?.patientId],
  );

  const doctorName = (id: string) =>
    db.doctors.find((d) => d.id === id)?.fullName ?? t('common.unknown');
  const doctorSpec = (id: string) => db.doctors.find((d) => d.id === id)?.specialization ?? '';

  const whenLabel = (appointment: Appointment) => {
    const today = toISODate(now);
    if (appointment.date === today) return t('appointments.today');
    if (appointment.date === toISODate(addDays(now, 1))) return t('appointments.tomorrow');
    return formatDateLong(appointment.date, locale);
  };

  return (
    <Screen title={t('appointments.title')}>
      <button
        type="button"
        className="btn btn-lg btn-primary"
        onClick={() => navigate('book')}
      >
        <Icon name="calendar" size={26} />
        {t('appointments.book')}
      </button>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'upcoming', label: t('appointments.upcoming') },
          { value: 'past', label: t('appointments.past') },
        ]}
      />

      {tab === 'upcoming' && (
        <>
          {upcoming.length === 0 && <EmptyState message={t('appointments.none')} />}
          {upcoming.map((appointment) => (
            <div className="card" key={appointment.id}>
              <div className="row">
                <div className="stack-sm" style={{ minWidth: 0 }}>
                  <span className="big-value">{doctorName(appointment.doctorId)}</span>
                  <span className="muted">{doctorSpec(appointment.doctorId)}</span>
                </div>
                <Chip tone={STATUS_TONE[appointment.status]}>
                  {t(`status.${appointment.status}` as TranslationKey)}
                </Chip>
              </div>

              <div className="row">
                <span style={{ fontWeight: 700 }}>
                  <Icon name="calendar" size={20} /> {whenLabel(appointment)}
                </span>
                <span className="row-time">{formatTime12h(appointment.time)}</span>
              </div>

              <span className="muted">
                {t('appointments.reason')}: {appointment.reason} ·{' '}
                {t(`mode.${appointment.mode}` as TranslationKey)}
              </span>

              <button
                type="button"
                className="btn btn-danger"
                style={{ minHeight: 52 }}
                onClick={() => {
                  setAppointmentStatus(appointment.id, 'cancelled');
                  showToast(t('appointments.cancelled_ok'));
                }}
              >
                {t('appointments.cancel')}
              </button>
            </div>
          ))}
        </>
      )}

      {tab === 'past' && (
        <Panel flush>
          {past.length === 0 && <EmptyState message={t('appointments.none_past')} />}
          {past.map((appointment) => (
            <RowItem
              key={appointment.id}
              title={doctorName(appointment.doctorId)}
              sub={`${formatDateLong(appointment.date, locale)} · ${appointment.reason}`}
              side={
                <Chip tone={STATUS_TONE[appointment.status]}>
                  {t(`status.${appointment.status}` as TranslationKey)}
                </Chip>
              }
              onClick={() => navigate('records', { tab: 'notes' })}
            />
          ))}
        </Panel>
      )}

      <SafetyNote />
      <Toast message={toast} />
    </Screen>
  );
}
