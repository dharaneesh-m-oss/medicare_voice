import { useMemo, useState } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import { appointmentTimestamp } from '../../../core/clinic/AppointmentService';
import { ageFrom } from '../../../core/auth/types';
import { adherenceRate } from '../../../core/scheduler/MedicationScheduler';
import { selectDoctorPatients } from '../../../core/storage/Database';
import { formatDateLong, toISODate } from '../../../core/utils/date';
import { Chip, EmptyState, Panel, SearchInput } from '../../components/kit';

export function DoctorPatientsScreen() {
  const { t, locale, db, doctor, bundleFor } = useApp();
  const { navigate } = useNavigator();
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    if (!doctor) return [];
    const today = toISODate(new Date());
    return selectDoctorPatients(db, doctor.id)
      .filter((patient) => patient.fullName.toLowerCase().includes(query.trim().toLowerCase()))
      .map((patient) => {
        const bundle = bundleFor(patient.id);
        const visits = db.appointments
          .filter((a) => a.patientId === patient.id)
          .sort((a, b) => appointmentTimestamp(a) - appointmentTimestamp(b));
        const past = visits.filter((a) => a.date < today && a.status === 'completed');
        const future = visits.filter((a) => a.date >= today && a.status !== 'cancelled');
        return {
          patient,
          adherence: adherenceRate(bundle.schedules, bundle.records, 14),
          lastVisit: past[past.length - 1]?.date ?? null,
          nextVisit: future[0]?.date ?? null,
        };
      });
  }, [db, doctor, query, bundleFor]);

  if (!doctor) return null;

  return (
    <div className="page page-pro">
      <div className="page-head">
        <div>
          <h2>{t('doctor.patients')}</h2>
          <span className="muted">{t('doctor.patient_count', { count: rows.length })}</span>
        </div>
      </div>

      <SearchInput value={query} onChange={setQuery} placeholder={t('doctor.search_patients')} />

      <Panel flush>
        {rows.length === 0 && <EmptyState message={t('hospital.no_results')} />}
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('profile.age')}</th>
                <th>{t('doctor.conditions')}</th>
                <th>{t('doctor.adherence')}</th>
                <th>{t('hospital.last_visit')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ patient, adherence, lastVisit, nextVisit }) => (
                <tr key={patient.id}>
                  <td className="cell-strong">{patient.fullName}</td>
                  <td className="cell-num">{ageFrom(patient.dateOfBirth) ?? '—'}</td>
                  <td>
                    {patient.conditions.length > 0
                      ? patient.conditions.join(', ')
                      : t('doctor.none_recorded')}
                  </td>
                  <td>
                    {adherence ? (
                      <Chip
                        tone={
                          adherence.percent >= 85
                            ? 'success'
                            : adherence.percent >= 60
                              ? 'warn'
                              : 'danger'
                        }
                      >
                        {t('doctor.adherence_value', { percent: adherence.percent })}
                      </Chip>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="stack-sm">
                      <span>{lastVisit ? formatDateLong(lastVisit, locale) : t('doctor.no_visits')}</span>
                      {nextVisit && (
                        <span className="muted">
                          {t('doctor.next_visit', { date: formatDateLong(nextVisit, locale) })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: 'auto', minHeight: 42, padding: '6px 14px' }}
                      onClick={() => navigate('doctor_patient', { patientId: patient.id })}
                    >
                      {t('doctor.view_record')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
