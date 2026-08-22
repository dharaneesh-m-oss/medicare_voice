import { useMemo } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import { ageFrom, bmiFrom } from '../../../core/auth/types';
import { VITAL_UNITS, type VitalType } from '../../../core/clinic/types';
import type { TranslationKey } from '../../../core/i18n';
import { adherenceRate, buildDayView } from '../../../core/scheduler/MedicationScheduler';
import { formatStrength } from '../../../core/types';
import { addDays, formatDateLong, formatTime12h, toISODate } from '../../../core/utils/date';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import {
  Avatar,
  Chip,
  EmptyState,
  KeyValue,
  LineChart,
  Meter,
  Panel,
  Stat,
} from '../../components/kit';

const CHARTED: VitalType[] = ['blood_pressure', 'blood_sugar', 'weight'];

export function DoctorPatientScreen() {
  const { t, locale, db, bundleFor } = useApp();
  const { params, navigate } = useNavigator();

  const patientId = params.patientId ?? null;
  const bundle = useMemo(() => bundleFor(patientId), [bundleFor, patientId]);
  const patient = bundle.patient;

  const adherence = useMemo(
    () => adherenceRate(bundle.schedules, bundle.records, 14),
    [bundle.schedules, bundle.records],
  );

  const perMedicine = useMemo(() => {
    const now = new Date();
    return bundle.schedules
      .filter((s) => s.times.length > 0)
      .map((schedule) => {
        let total = 0;
        let taken = 0;
        for (let offset = 13; offset >= 0; offset -= 1) {
          const date = toISODate(addDays(now, -offset));
          for (const view of buildDayView([schedule], bundle.records, date, now)) {
            if (view.status === 'upcoming') continue;
            total += 1;
            if (view.status === 'taken') taken += 1;
          }
        }
        return { schedule, total, taken };
      });
  }, [bundle.schedules, bundle.records]);

  if (!patient) {
    return (
      <Screen title={t('doctor.view_record')}>
        <EmptyState message={t('hospital.no_results')} />
      </Screen>
    );
  }

  const doctorName = (id: string) =>
    db.doctors.find((d) => d.id === id)?.fullName ?? t('common.unknown');

  const seriesFor = (type: VitalType) =>
    bundle.vitals
      .filter((v) => v.type === type)
      .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
      .map((v) => ({
        label: new Date(v.measuredAt).toLocaleDateString(locale, {
          day: 'numeric',
          month: 'short',
        }),
        value: v.value,
      }));

  return (
    <Screen title={patient.fullName}>
      <div className="card">
        <div className="row">
          <Avatar name={patient.fullName} large plain />
          <div className="stack-sm" style={{ flex: 1, minWidth: 0 }}>
            <span className="big-value">{patient.fullName}</span>
            <span className="muted">
              {ageFrom(patient.dateOfBirth) ?? '—'} · {t(`gender.${patient.gender}` as TranslationKey)}{' '}
              · {patient.bloodGroup}
            </span>
            <span className="chip-row">
              {patient.conditions.map((condition) => (
                <Chip key={condition} tone="violet">
                  {condition}
                </Chip>
              ))}
              {patient.allergies.map((allergy) => (
                <Chip key={allergy} tone="danger">
                  {t('doctor.allergies')}: {allergy}
                </Chip>
              ))}
            </span>
          </div>
        </div>

        <KeyValue
          rows={[
            { label: t('doctor.contact'), value: patient.phone || '—' },
            {
              label: t('profile.emergency'),
              value: patient.emergencyContactName
                ? `${patient.emergencyContactName} · ${patient.emergencyContactPhone}`
                : '—',
            },
            { label: t('profile.abha'), value: patient.abhaId ?? '—' },
            { label: t('profile.bmi'), value: bmiFrom(patient.heightCm, patient.weightKg) ?? '—' },
          ]}
        />

        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            navigate('doctor_consult', {
              patientId: patient.id,
              appointmentId: params.appointmentId,
            })
          }
        >
          <Icon name="stethoscope" size={24} />
          {t('doctor.start_consult')}
        </button>
      </div>

      <div className="stat-grid">
        <Stat
          label={t('doctor.adherence')}
          value={adherence ? `${adherence.percent}%` : '—'}
          foot={adherence ? `${adherence.taken}/${adherence.total}` : undefined}
          accent={
            !adherence ? 'primary' : adherence.percent >= 85 ? 'success' : adherence.percent >= 60 ? 'warn' : 'danger'
          }
        />
        <Stat label={t('doctor.medications')} value={bundle.schedules.length} accent="primary" />
        <Stat label={t('records.notes')} value={bundle.notes.length} accent="violet" />
        <Stat
          label={t('records.prescriptions')}
          value={bundle.prescriptions.length}
          accent="primary"
        />
      </div>

      <Panel title={t('doctor.medications')}>
        {perMedicine.length === 0 && <EmptyState message={t('medicines.empty')} />}
        {perMedicine.map(({ schedule, total, taken }) => (
          <div className="stack-sm" key={schedule.id}>
            <div className="row">
              <span style={{ fontWeight: 700 }}>
                {schedule.medicineName} {formatStrength(schedule.strength)}
              </span>
              <span className="muted">
                {schedule.times.map(formatTime12h).join(', ') ||
                  t(`freq.${schedule.frequency}` as TranslationKey)}
              </span>
            </div>
            {total > 0 && (
              <>
                <Meter
                  value={taken}
                  max={total}
                  tone={taken / total >= 0.85 ? 'success' : taken / total >= 0.6 ? 'warn' : 'danger'}
                />
                <span className="muted">
                  {t('doctor.adherence_value', { percent: Math.round((taken / total) * 100) })}
                </span>
              </>
            )}
          </div>
        ))}
      </Panel>

      <Panel title={t('doctor.recent_readings')}>
        {CHARTED.every((type) => seriesFor(type).length === 0) && (
          <EmptyState message={t('records.no_vitals')} />
        )}
        {CHARTED.map((type) => {
          const points = seriesFor(type);
          if (points.length === 0) return null;
          const target = bundle.vitalTargets.find((v) => v.type === type);
          const latest = points[points.length - 1];
          return (
            <div className="stack-sm" key={type}>
              <div className="row">
                <span style={{ fontWeight: 700 }}>{t(`vital.${type}` as TranslationKey)}</span>
                <Chip>
                  {latest.value} {VITAL_UNITS[type]}
                </Chip>
              </div>
              <LineChart
                points={points}
                band={target ? { min: target.min, max: target.max } : undefined}
                height={90}
              />
            </div>
          );
        })}
      </Panel>

      <Panel title={t('records.notes')}>
        {bundle.notes.length === 0 && <EmptyState message={t('records.no_notes')} />}
        <div className="timeline">
          {[...bundle.notes]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((note) => (
              <div className="timeline-item" key={note.id}>
                <span className="timeline-dot" />
                <div className="stack-sm" style={{ flex: 1 }}>
                  <div className="row">
                    <span style={{ fontWeight: 700 }}>{doctorName(note.doctorId)}</span>
                    <span className="muted">{formatDateLong(note.date, locale)}</span>
                  </div>
                  <span className="muted">{note.complaint}</span>
                  <span>{note.observations}</span>
                  <span className="muted">{note.advice}</span>
                </div>
              </div>
            ))}
        </div>
      </Panel>

      <Panel title={t('records.prescriptions')}>
        {bundle.prescriptions.length === 0 && <EmptyState message={t('records.no_prescriptions')} />}
        {[...bundle.prescriptions]
          .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
          .map((rx) => (
            <div className="stack-sm" key={rx.id}>
              <div className="row">
                <span style={{ fontWeight: 700 }}>{doctorName(rx.doctorId)}</span>
                <span className="muted">{new Date(rx.issuedAt).toLocaleDateString(locale)}</span>
              </div>
              {rx.items.map((item, index) => (
                <span key={index} className="muted">
                  {item.medicineName} {formatStrength(item.strength)} ·{' '}
                  {t(`freq.${item.frequency}` as TranslationKey)} ·{' '}
                  {t('records.duration_days', { days: item.durationDays })}
                </span>
              ))}
              {!rx.addedToSchedule && <Chip tone="warn">{t('records.add_to_schedule')}</Chip>}
            </div>
          ))}
      </Panel>
    </Screen>
  );
}
