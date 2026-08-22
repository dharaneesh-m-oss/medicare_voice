import { useMemo, useState } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import { VITAL_UNITS, type VitalType } from '../../../core/clinic/types';
import type { TranslationKey } from '../../../core/i18n';
import { formatStrength } from '../../../core/types';
import { formatDateLong, formatTime12h } from '../../../core/utils/date';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Field, SafetyNote } from '../../components/common';
import {
  Chip,
  EmptyState,
  LineChart,
  Panel,
  Segmented,
  Toast,
  useToast,
} from '../../components/kit';

const TRACKED: VitalType[] = ['blood_pressure', 'blood_sugar', 'weight', 'heart_rate', 'spo2'];

export function HealthRecordsScreen() {
  const {
    t,
    locale,
    db,
    session,
    vitals,
    vitalTargets,
    notes,
    prescriptions,
    addVital,
    adoptPrescription,
  } = useApp();
  const { params } = useNavigator();
  const [tab, setTab] = useState<'vitals' | 'notes' | 'prescriptions'>(
    (params.tab as 'vitals' | 'notes' | 'prescriptions') ?? 'vitals',
  );
  const [toast, showToast] = useToast();

  const [type, setType] = useState<VitalType>('blood_pressure');
  const [value, setValue] = useState('');
  const [secondary, setSecondary] = useState('');
  const [adding, setAdding] = useState(false);

  const doctorName = (id: string) =>
    db.doctors.find((d) => d.id === id)?.fullName ?? t('common.unknown');

  const series = useMemo(() => {
    const map = new Map<VitalType, { label: string; value: number }[]>();
    for (const item of TRACKED) {
      const points = vitals
        .filter((v) => v.type === item)
        .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
        .map((v) => ({
          label: new Date(v.measuredAt).toLocaleDateString(locale, {
            day: 'numeric',
            month: 'short',
          }),
          value: v.value,
        }));
      if (points.length > 0) map.set(item, points);
    }
    return map;
  }, [vitals, locale]);

  const latestOf = (item: VitalType) =>
    vitals
      .filter((v) => v.type === item)
      .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0] ?? null;

  const save = () => {
    if (!session?.patientId || !value) return;
    addVital({
      patientId: session.patientId,
      type,
      value: Number(value),
      secondaryValue: type === 'blood_pressure' && secondary ? Number(secondary) : null,
      measuredAt: new Date().toISOString(),
      source: 'self',
      note: '',
    });
    setValue('');
    setSecondary('');
    setAdding(false);
    showToast(t('records.reading_saved'));
  };

  return (
    <Screen title={t('records.title')}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'vitals', label: t('records.vitals') },
          { value: 'notes', label: t('records.notes') },
          { value: 'prescriptions', label: t('records.prescriptions') },
        ]}
      />

      {/* ---------------- readings ---------------- */}
      {tab === 'vitals' && (
        <>
          {!adding && (
            <button type="button" className="btn btn-secondary" onClick={() => setAdding(true)}>
              <Icon name="plus" size={24} />
              {t('records.add_reading')}
            </button>
          )}

          {adding && (
            <div className="card">
              <Field label={t('common.select')}>
                <select
                  className="select"
                  value={type}
                  onChange={(e) => setType(e.target.value as VitalType)}
                >
                  {TRACKED.map((item) => (
                    <option key={item} value={item}>
                      {t(`vital.${item}` as TranslationKey)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="inline-fields">
                <Field label={`${t('records.value')} (${VITAL_UNITS[type]})`}>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </Field>
                {type === 'blood_pressure' && (
                  <Field label={t('records.secondary_value')}>
                    <input
                      className="input"
                      inputMode="decimal"
                      value={secondary}
                      onChange={(e) => setSecondary(e.target.value)}
                    />
                  </Field>
                )}
              </div>
              <div className="btn-row">
                <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>
                  {t('common.cancel')}
                </button>
                <button type="button" className="btn btn-primary" onClick={save}>
                  {t('common.save')}
                </button>
              </div>
            </div>
          )}

          {series.size === 0 && <EmptyState message={t('records.no_vitals')} />}

          {[...series.entries()].map(([item, points]) => {
            const latest = latestOf(item);
            const target = vitalTargets.find((v) => v.type === item);
            const outside =
              latest && target && (latest.value < target.min || latest.value > target.max);
            return (
              <Panel
                key={item}
                title={t(`vital.${item}` as TranslationKey)}
                action={
                  latest && (
                    <Chip tone={outside ? 'warn' : 'success'}>
                      {latest.secondaryValue !== null
                        ? `${latest.value}/${latest.secondaryValue}`
                        : latest.value}{' '}
                      {VITAL_UNITS[item]}
                    </Chip>
                  )
                }
              >
                <LineChart
                  points={points}
                  band={target ? { min: target.min, max: target.max } : undefined}
                />
                {target && (
                  <span className="muted">
                    {t('records.target_range', {
                      range:
                        target.secondaryMin !== null
                          ? `${target.min}/${target.secondaryMin} – ${target.max}/${target.secondaryMax}`
                          : `${target.min} – ${target.max}`,
                    })}{' '}
                    · {t('records.set_by', { name: doctorName(target.setByDoctorId) })}
                  </span>
                )}
                {latest && (
                  <span className="muted">
                    {t('records.measured_on', {
                      date: new Date(latest.measuredAt).toLocaleString(locale),
                    })}{' '}
                    ·{' '}
                    {latest.source === 'clinic'
                      ? t('records.source_clinic')
                      : t('records.source_self')}
                  </span>
                )}
              </Panel>
            );
          })}
        </>
      )}

      {/* ---------------- doctor notes ---------------- */}
      {tab === 'notes' && (
        <>
          {notes.length === 0 && <EmptyState message={t('records.no_notes')} />}
          <div className="timeline">
            {[...notes]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((note) => (
                <div className="timeline-item" key={note.id}>
                  <span className="timeline-dot" />
                  <div className="card card-tight" style={{ flex: 1 }}>
                    <div className="row">
                      <span style={{ fontWeight: 800 }}>{doctorName(note.doctorId)}</span>
                      <span className="muted">{formatDateLong(note.date, locale)}</span>
                    </div>
                    <div className="stack-sm">
                      <span className="detail-label">{t('records.complaint')}</span>
                      <span>{note.complaint}</span>
                    </div>
                    <div className="stack-sm">
                      <span className="detail-label">{t('records.observations')}</span>
                      <span>{note.observations}</span>
                    </div>
                    <div className="stack-sm">
                      <span className="detail-label">{t('records.advice')}</span>
                      <span>{note.advice}</span>
                    </div>
                    {note.followUpDate && (
                      <Chip tone="primary">
                        {t('records.follow_up', {
                          date: formatDateLong(note.followUpDate, locale),
                        })}
                      </Chip>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {/* ---------------- prescriptions ---------------- */}
      {tab === 'prescriptions' && (
        <>
          {prescriptions.length === 0 && <EmptyState message={t('records.no_prescriptions')} />}
          {[...prescriptions]
            .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
            .map((rx) => (
              <div className="card" key={rx.id}>
                <div className="row">
                  <span style={{ fontWeight: 800 }}>
                    {t('records.issued_by', { name: doctorName(rx.doctorId) })}
                  </span>
                  <span className="muted">{new Date(rx.issuedAt).toLocaleDateString(locale)}</span>
                </div>

                {rx.items.map((item, index) => (
                  <div className="detail" key={`${rx.id}-${index}`}>
                    <span className="detail-value">
                      {item.medicineName} {formatStrength(item.strength)}
                    </span>
                    <span className="muted">
                      {t(`freq.${item.frequency}` as TranslationKey)} ·{' '}
                      {item.times.map(formatTime12h).join(', ')} ·{' '}
                      {t('records.duration_days', { days: item.durationDays })}
                    </span>
                    {item.instructions && <span className="muted">{item.instructions}</span>}
                  </div>
                ))}

                {rx.notes && <span className="muted">{rx.notes}</span>}

                {rx.addedToSchedule ? (
                  <Chip tone="success">{t('records.added_to_schedule')}</Chip>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      adoptPrescription(rx.id);
                      showToast(t('records.added_to_schedule'));
                    }}
                  >
                    <Icon name="plus" size={24} />
                    {t('records.add_to_schedule')}
                  </button>
                )}
              </div>
            ))}
        </>
      )}

      <SafetyNote />
      <Toast message={toast} />
    </Screen>
  );
}
