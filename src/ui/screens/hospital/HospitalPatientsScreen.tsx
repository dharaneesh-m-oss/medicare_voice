import { useMemo, useState } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import { ageFrom } from '../../../core/auth/types';
import { appointmentTimestamp } from '../../../core/clinic/AppointmentService';
import { adherenceRate } from '../../../core/scheduler/MedicationScheduler';
import { formatDateLong, toISODate } from '../../../core/utils/date';
import { Chip, EmptyState, Panel, SearchInput } from '../../components/kit';

export function HospitalPatientsScreen() {
  const { t, locale, db, bundleFor } = useApp();
  const { navigate } = useNavigator();
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const today = toISODate(new Date());
    const needle = query.trim().toLowerCase();
    return db.patients
      .filter(
        (patient) =>
          !needle ||
          patient.fullName.toLowerCase().includes(needle) ||
          patient.phone.includes(needle) ||
          (patient.abhaId ?? '').includes(needle),
      )
      .map((patient) => {
        const bundle = bundleFor(patient.id);
        const visits = db.appointments
          .filter((a) => a.patientId === patient.id && a.status === 'completed')
          .sort((a, b) => appointmentTimestamp(a) - appointmentTimestamp(b));
        const next = db.appointments
          .filter(
            (a) =>
              a.patientId === patient.id &&
              a.date >= today &&
              (a.status === 'confirmed' || a.status === 'requested'),
          )
          .sort((a, b) => appointmentTimestamp(a) - appointmentTimestamp(b))[0];
        return {
          patient,
          adherence: adherenceRate(bundle.schedules, bundle.records, 14),
          lastVisit: visits[visits.length - 1]?.date ?? null,
          nextVisit: next?.date ?? null,
          doctor: db.doctors.find((d) => d.id === patient.primaryDoctorId)?.fullName ?? '—',
        };
      });
  }, [db, query, bundleFor]);

  return (
    <div className="page page-pro">
      <div className="page-head">
        <div>
          <h2>{t('hospital.registry')}</h2>
          <span className="muted">{t('doctor.patient_count', { count: db.patients.length })}</span>
        </div>
      </div>

      <SearchInput value={query} onChange={setQuery} placeholder={t('hospital.search')} />

      <Panel flush>
        {rows.length === 0 && <EmptyState message={t('hospital.no_results')} />}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('hospital.record_id')}</th>
                  <th>{t('common.name')}</th>
                  <th>{t('profile.age')}</th>
                  <th>{t('doctor.contact')}</th>
                  <th>{t('profile.primary_doctor')}</th>
                  <th>{t('doctor.adherence')}</th>
                  <th>{t('hospital.last_visit')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ patient, adherence, lastVisit, nextVisit, doctor }) => (
                  <tr key={patient.id}>
                    <td className="cell-num muted">{patient.id.replace('pat_', '').toUpperCase()}</td>
                    <td className="cell-strong">{patient.fullName}</td>
                    <td className="cell-num">{ageFrom(patient.dateOfBirth) ?? '—'}</td>
                    <td className="cell-num">{patient.phone}</td>
                    <td>{doctor}</td>
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
                          {adherence.percent}%
                        </Chip>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="stack-sm">
                        <span>
                          {lastVisit ? formatDateLong(lastVisit, locale) : t('doctor.no_visits')}
                        </span>
                        {nextVisit && (
                          <span className="muted">
                            {t('doctor.next_visit', { date: formatDateLong(nextVisit, locale) })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="chip-row">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ width: 'auto', minHeight: 40, padding: '4px 12px' }}
                          onClick={() => navigate('doctor_patient', { patientId: patient.id })}
                        >
                          {t('doctor.view_record')}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
