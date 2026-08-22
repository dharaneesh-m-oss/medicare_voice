import { useMemo, useState } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import { dayQueue } from '../../../core/clinic/AppointmentService';
import type { Appointment } from '../../../core/clinic/types';
import type { TranslationKey } from '../../../core/i18n';
import { selectDoctorPatients } from '../../../core/storage/Database';
import { addDays, formatDateLong, formatTime12h, toISODate } from '../../../core/utils/date';
import { Icon } from '../../components/Icon';
import { STATUS_TONE } from '../patient/AppointmentsScreen';
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

export function DoctorHomeScreen() {
  const { t, locale, db, doctor, setAppointmentStatus } = useApp();
  const { navigate } = useNavigator();
  const [dayOffset, setDayOffset] = useState(0);
  const [toast, showToast] = useToast();

  const now = new Date();
  const date = toISODate(addDays(now, dayOffset));

  const queue = useMemo(
    () => (doctor ? dayQueue(db.appointments, doctor.id, date) : []),
    [db.appointments, doctor, date],
  );

  const patients = useMemo(
    () => (doctor ? selectDoctorPatients(db, doctor.id) : []),
    [db, doctor],
  );

  if (!doctor) return null;

  const patientName = (id: string) =>
    db.patients.find((p) => p.id === id)?.fullName ?? t('common.unknown');

  const requests = db.appointments.filter(
    (a) => a.doctorId === doctor.id && a.status === 'requested',
  );

  const advance = (appointment: Appointment) => {
    const next =
      appointment.status === 'requested'
        ? 'confirmed'
        : appointment.status === 'confirmed'
          ? 'checked_in'
          : 'completed';
    setAppointmentStatus(appointment.id, next);
    showToast(t(`status.${next}` as TranslationKey));
  };

  const actionLabel = (appointment: Appointment) =>
    appointment.status === 'requested'
      ? t('hospital.confirm')
      : appointment.status === 'confirmed'
        ? t('doctor.check_in')
        : t('doctor.complete');

  return (
    <div className="page page-pro">
      <div className="page-head">
        <div>
          <h2>{t('doctor.today_clinic')}</h2>
          <span className="muted">{formatDateLong(date, locale)}</span>
        </div>
        <div className="chip-row">
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: 'auto', minHeight: 44, padding: '6px 14px' }}
            onClick={() => setDayOffset((v) => v - 1)}
          >
            ←
          </button>
          <Chip tone="primary">{dayOffset === 0 ? t('common.today') : date}</Chip>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: 'auto', minHeight: 44, padding: '6px 14px' }}
            onClick={() => setDayOffset((v) => v + 1)}
          >
            →
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <Stat
          label={t('doctor.stats_today')}
          value={queue.filter((a) => a.status !== 'cancelled').length}
          accent="primary"
        />
        <Stat
          label={t('doctor.stats_waiting')}
          value={queue.filter((a) => a.status === 'checked_in').length}
          accent="violet"
        />
        <Stat
          label={t('doctor.stats_completed')}
          value={queue.filter((a) => a.status === 'completed').length}
          accent="success"
        />
        <Stat label={t('doctor.stats_requests')} value={requests.length} accent="warn" />
        <Stat
          label={t('doctor.patients')}
          value={patients.length}
          accent="primary"
          foot={t('doctor.patient_count', { count: patients.length })}
        />
      </div>

      <Panel title={t('doctor.queue')} flush>
        {queue.length === 0 && <EmptyState message={t('doctor.no_appointments')} />}
        {queue.map((appointment) => (
          <RowItem
            key={appointment.id}
            leading={<Avatar name={patientName(appointment.patientId)} plain />}
            title={patientName(appointment.patientId)}
            sub={`${appointment.reason} · ${t(`mode.${appointment.mode}` as TranslationKey)}`}
            side={
              <>
                <span className="row-time">{formatTime12h(appointment.time)}</span>
                <Chip tone={STATUS_TONE[appointment.status]}>
                  {t(`status.${appointment.status}` as TranslationKey)}
                </Chip>
              </>
            }
            onClick={() =>
              navigate('doctor_patient', {
                patientId: appointment.patientId,
                appointmentId: appointment.id,
              })
            }
          />
        ))}
      </Panel>

      {queue.filter((a) => a.status !== 'completed' && a.status !== 'cancelled').length > 0 && (
        <Panel title={t('common.actions')}>
          {queue
            .filter((a) => a.status !== 'completed' && a.status !== 'cancelled')
            .map((appointment) => (
              <div className="row" key={`act-${appointment.id}`}>
                <span style={{ fontWeight: 700 }}>
                  {formatTime12h(appointment.time)} · {patientName(appointment.patientId)}
                </span>
                <span className="chip-row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: 'auto', minHeight: 44, padding: '6px 16px' }}
                    onClick={() => advance(appointment)}
                  >
                    {actionLabel(appointment)}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: 'auto', minHeight: 44, padding: '6px 16px' }}
                    onClick={() =>
                      navigate('doctor_consult', {
                        patientId: appointment.patientId,
                        appointmentId: appointment.id,
                      })
                    }
                  >
                    <Icon name="stethoscope" size={20} />
                    {t('doctor.start_consult')}
                  </button>
                </span>
              </div>
            ))}
        </Panel>
      )}

      <Toast message={toast} />
    </div>
  );
}
