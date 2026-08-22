import { useMemo, useState } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import { hospitalDay } from '../../../core/clinic/AppointmentService';
import type { AppointmentStatus } from '../../../core/clinic/types';
import type { TranslationKey } from '../../../core/i18n';
import { addDays, formatDateLong, formatTime12h, toISODate } from '../../../core/utils/date';
import { STATUS_TONE } from '../patient/AppointmentsScreen';
import { Chip, EmptyState, Panel } from '../../components/kit';

const NEXT_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  requested: 'confirmed',
  confirmed: 'checked_in',
  checked_in: 'completed',
};

export function HospitalAppointmentsScreen() {
  const { t, locale, db, hospital, setAppointmentStatus } = useApp();
  const { navigate } = useNavigator();
  const [offset, setOffset] = useState(0);
  const [doctorFilter, setDoctorFilter] = useState('');

  const date = toISODate(addDays(new Date(), offset));

  const rows = useMemo(() => {
    if (!hospital) return [];
    return hospitalDay(db.appointments, hospital.id, date).filter(
      (a) => !doctorFilter || a.doctorId === doctorFilter,
    );
  }, [db.appointments, hospital, date, doctorFilter]);

  if (!hospital) return null;

  const patientName = (id: string) =>
    db.patients.find((p) => p.id === id)?.fullName ?? t('common.unknown');
  const doctorName = (id: string) =>
    db.doctors.find((d) => d.id === id)?.fullName ?? t('common.unknown');

  return (
    <div className="page page-pro">
      <div className="page-head">
        <div>
          <h2>{t('hospital.appointment_board')}</h2>
          <span className="muted">{formatDateLong(date, locale)}</span>
        </div>
        <div className="chip-row">
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: 'auto', minHeight: 44, padding: '6px 14px' }}
            onClick={() => setOffset((v) => v - 1)}
          >
            ←
          </button>
          <Chip tone="primary">{offset === 0 ? t('common.today') : date}</Chip>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: 'auto', minHeight: 44, padding: '6px 14px' }}
            onClick={() => setOffset((v) => v + 1)}
          >
            →
          </button>
        </div>
      </div>

      <select
        className="select"
        value={doctorFilter}
        onChange={(e) => setDoctorFilter(e.target.value)}
      >
        <option value="">{t('hospital.all_doctors')}</option>
        {db.doctors.map((doctor) => (
          <option key={doctor.id} value={doctor.id}>
            {doctor.fullName} — {doctor.specialization}
          </option>
        ))}
      </select>

      <Panel flush>
        {rows.length === 0 && <EmptyState message={t('doctor.no_appointments')} />}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('common.time')}</th>
                  <th>{t('nav.patients')}</th>
                  <th>{t('hospital.doctors')}</th>
                  <th>{t('appointments.reason')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((appointment) => {
                  const next = NEXT_STATUS[appointment.status];
                  return (
                    <tr key={appointment.id}>
                      <td className="cell-num cell-strong">{formatTime12h(appointment.time)}</td>
                      <td>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() =>
                            navigate('doctor_patient', { patientId: appointment.patientId })
                          }
                        >
                          {patientName(appointment.patientId)}
                        </button>
                      </td>
                      <td>{doctorName(appointment.doctorId)}</td>
                      <td>{appointment.reason}</td>
                      <td>
                        <Chip tone={STATUS_TONE[appointment.status]}>
                          {t(`status.${appointment.status}` as TranslationKey)}
                        </Chip>
                      </td>
                      <td>
                        <span className="chip-row">
                          {next && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ width: 'auto', minHeight: 40, padding: '4px 12px' }}
                              onClick={() => setAppointmentStatus(appointment.id, next)}
                            >
                              {t(`status.${next}` as TranslationKey)}
                            </button>
                          )}
                          {appointment.status !== 'cancelled' &&
                            appointment.status !== 'completed' && (
                              <button
                                type="button"
                                className="btn btn-danger"
                                style={{ width: 'auto', minHeight: 40, padding: '4px 12px' }}
                                onClick={() => setAppointmentStatus(appointment.id, 'cancelled')}
                              >
                                {t('hospital.decline')}
                              </button>
                            )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
