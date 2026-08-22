import { useMemo } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import { hospitalDay, hospitalStats } from '../../../core/clinic/AppointmentService';
import { outstandingFollowUps } from '../../../core/notifications/NotificationService';
import type { TranslationKey } from '../../../core/i18n';
import { formatDateLong, formatTime12h, toISODate } from '../../../core/utils/date';
import { STATUS_TONE } from '../patient/AppointmentsScreen';
import { Icon } from '../../components/Icon';
import {
  Avatar,
  Chip,
  EmptyState,
  Panel,
  RowItem,
  Stat,
  Toast,
  useToast,
} from '../../components/kit';

export function HospitalHomeScreen() {
  const { t, locale, db, hospital, setAppointmentStatus, sendNotification } = useApp();
  const { navigate } = useNavigator();
  const [toast, showToast] = useToast();

  const now = new Date();
  const today = toISODate(now);

  const stats = useMemo(
    () => (hospital ? hospitalStats(db.appointments, hospital.id, now) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db.appointments, hospital],
  );

  const board = useMemo(
    () => (hospital ? hospitalDay(db.appointments, hospital.id, today) : []),
    [db.appointments, hospital, today],
  );

  /**
   * The alert the desk actually acts on: a doctor asked the patient back, the
   * date is close, and nothing is on the book. Recomputed from the notes and
   * the appointment list, so it disappears the moment a booking is made.
   */
  const followUps = useMemo(
    () => outstandingFollowUps(db, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db],
  );

  const requests = useMemo(
    () =>
      hospital
        ? db.appointments.filter((a) => a.hospitalId === hospital.id && a.status === 'requested')
        : [],
    [db.appointments, hospital],
  );

  if (!hospital || !stats) return null;

  const patientName = (id: string) =>
    db.patients.find((p) => p.id === id)?.fullName ?? t('common.unknown');
  const doctorName = (id: string) =>
    db.doctors.find((d) => d.id === id)?.fullName ?? t('common.unknown');

  return (
    <div className="page page-pro">
      <div className="page-head">
        <div>
          <h2>{hospital.name}</h2>
          <span className="muted">
            {hospital.city} · {formatDateLong(today, locale)}
          </span>
        </div>
        <Chip tone="primary">{t('app.prototype_badge')}</Chip>
      </div>

      <div className="stat-grid">
        <Stat label={t('hospital.stat_today')} value={stats.today} accent="primary" />
        <Stat label={t('hospital.stat_waiting')} value={stats.waiting} accent="violet" />
        <Stat label={t('hospital.stat_completed')} value={stats.completed} accent="success" />
        <Stat label={t('hospital.stat_requests')} value={stats.requests} accent="warn" />
        <Stat label={t('hospital.stat_upcoming')} value={stats.upcoming7Days} accent="primary" />
        <Stat
          label={t('hospital.stat_patients')}
          value={db.patients.length}
          accent="primary"
          foot={`${db.doctors.length} ${t('hospital.doctors').toLowerCase()}`}
        />
      </div>

      <Panel
        title={t('notify.follow_ups')}
        action={<Chip tone={followUps.length > 0 ? 'warn' : 'success'}>{followUps.length}</Chip>}
        flush
      >
        {followUps.length === 0 && <EmptyState message={t('notify.no_follow_ups')} />}
        {followUps.map((item) => (
          <RowItem
            key={item.note.id}
            leading={<Avatar name={item.patient.fullName} plain />}
            title={item.patient.fullName}
            sub={t('notify.follow_up_body', {
              name: item.patient.fullName,
              doctor: item.doctorName,
              date: formatDateLong(item.note.followUpDate as string, locale),
              days: Math.abs(item.daysUntil),
            })}
            side={
              <>
                <Chip
                  tone={
                    item.severity === 'urgent'
                      ? 'danger'
                      : item.severity === 'attention'
                        ? 'warn'
                        : 'default'
                  }
                >
                  {item.daysUntil < 0
                    ? t('notify.overdue_by', { days: Math.abs(item.daysUntil) })
                    : item.daysUntil === 0
                      ? t('notify.due_today')
                      : t('notify.due_in', { days: item.daysUntil })}
                </Chip>
                <span className="chip-row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: 'auto', minHeight: 42, padding: '6px 14px' }}
                    onClick={() => {
                      sendNotification({
                        toPatientId: item.patient.id,
                        kind: 'follow_up_due',
                        title: t('notify.message_title'),
                        body: t('notify.message_body', {
                          doctor: item.doctorName,
                          date: formatDateLong(item.note.followUpDate as string, locale),
                        }),
                        actionScreen: 'book',
                      });
                      showToast(t('notify.reminder_sent', { name: item.patient.fullName }));
                    }}
                  >
                    <Icon name="phone" size={18} />
                    {t('notify.send_reminder')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: 'auto', minHeight: 42, padding: '6px 14px' }}
                    onClick={() => navigate('book', { patientId: item.patient.id })}
                  >
                    {t('notify.book_now')}
                  </button>
                </span>
              </>
            }
          />
        ))}
      </Panel>

      {requests.length > 0 && (
        <Panel title={t('hospital.stat_requests')} flush>
          {requests.map((appointment) => (
            <RowItem
              key={appointment.id}
              leading={<Avatar name={patientName(appointment.patientId)} plain />}
              title={patientName(appointment.patientId)}
              sub={`${doctorName(appointment.doctorId)} · ${appointment.date} ${formatTime12h(
                appointment.time,
              )} · ${appointment.reason}`}
              side={
                <span className="chip-row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: 'auto', minHeight: 42, padding: '6px 14px' }}
                    onClick={() => setAppointmentStatus(appointment.id, 'confirmed')}
                  >
                    {t('hospital.confirm')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ width: 'auto', minHeight: 42, padding: '6px 14px' }}
                    onClick={() => setAppointmentStatus(appointment.id, 'cancelled')}
                  >
                    {t('hospital.decline')}
                  </button>
                </span>
              }
            />
          ))}
        </Panel>
      )}

      <Panel
        title={t('hospital.appointment_board')}
        action={
          <button
            type="button"
            className="link-button"
            onClick={() => navigate('hospital_appointments')}
          >
            {t('common.view')} →
          </button>
        }
        flush
      >
        {board.length === 0 && <EmptyState message={t('doctor.no_appointments')} />}
        {board.slice(0, 6).map((appointment) => (
          <RowItem
            key={appointment.id}
            title={patientName(appointment.patientId)}
            sub={`${doctorName(appointment.doctorId)} · ${appointment.reason}`}
            side={
              <>
                <span className="row-time">{formatTime12h(appointment.time)}</span>
                <Chip tone={STATUS_TONE[appointment.status]}>
                  {t(`status.${appointment.status}` as TranslationKey)}
                </Chip>
              </>
            }
            onClick={() => navigate('doctor_patient', { patientId: appointment.patientId })}
          />
        ))}
      </Panel>

      <Toast message={toast} />
    </div>
  );
}
