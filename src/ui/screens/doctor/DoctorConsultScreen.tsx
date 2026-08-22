import { useMemo, useState } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import { VITAL_UNITS, type PrescriptionItem, type VitalType } from '../../../core/clinic/types';
import type { TranslationKey } from '../../../core/i18n';
import { defaultTimesFor } from '../../../core/scheduler/MedicationScheduler';
import {
  TIMES_PER_FREQUENCY,
  type DosageForm,
  type Frequency,
  type StrengthUnit,
} from '../../../core/types';
import { toISODate } from '../../../core/utils/date';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Field, OptionGroup } from '../../components/common';
import { EmptyState, Panel, Toast, useToast } from '../../components/kit';

const FREQUENCIES: Frequency[] = [
  'once_daily',
  'twice_daily',
  'thrice_daily',
  'every_other_day',
  'weekly',
  'as_needed',
];
const FORMS: DosageForm[] = ['tablet', 'capsule', 'syrup', 'drops', 'injection'];
const UNITS: StrengthUnit[] = ['mg', 'mcg', 'g', 'ml', 'IU'];
const TARGET_TYPES: VitalType[] = ['blood_pressure', 'blood_sugar', 'weight'];

interface DraftItem {
  medicineName: string;
  strengthValue: string;
  unit: StrengthUnit;
  form: DosageForm;
  frequency: Frequency;
  durationDays: string;
  instructions: string;
}

const emptyItem: DraftItem = {
  medicineName: '',
  strengthValue: '',
  unit: 'mg',
  form: 'tablet',
  frequency: 'once_daily',
  durationDays: '30',
  instructions: '',
};

export function DoctorConsultScreen() {
  const {
    t,
    doctor,
    bundleFor,
    addClinicalNote,
    addPrescription,
    setVitalTarget,
    setAppointmentStatus,
  } = useApp();
  const { params, goBack } = useNavigator();
  const [toast, showToast] = useToast();

  const patientId = params.patientId ?? null;
  const bundle = useMemo(() => bundleFor(patientId), [bundleFor, patientId]);

  const [complaint, setComplaint] = useState('');
  const [observations, setObservations] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const [items, setItems] = useState<DraftItem[]>([{ ...emptyItem }]);

  const [targetType, setTargetType] = useState<VitalType>('blood_pressure');
  const [targetMin, setTargetMin] = useState('');
  const [targetMax, setTargetMax] = useState('');
  const [targetSecondaryMin, setTargetSecondaryMin] = useState('');
  const [targetSecondaryMax, setTargetSecondaryMax] = useState('');

  if (!bundle.patient || !doctor) {
    return (
      <Screen title={t('doctor.consult_title')}>
        <EmptyState message={t('hospital.no_results')} />
      </Screen>
    );
  }

  const patchItem = (index: number, patch: Partial<DraftItem>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const saveNote = () => {
    addClinicalNote({
      patientId: bundle.patient!.id,
      doctorId: doctor.id,
      appointmentId: params.appointmentId ?? null,
      date: toISODate(new Date()),
      complaint,
      observations,
      advice,
      followUpDate: followUpDate || null,
    });
    if (params.appointmentId) setAppointmentStatus(params.appointmentId, 'completed');
    showToast(t('doctor.note_saved'));
  };

  const savePrescription = () => {
    const usable = items.filter((item) => item.medicineName.trim());
    if (usable.length === 0) return;

    const built: PrescriptionItem[] = usable.map((item) => ({
      medicineName: item.medicineName.trim(),
      strength: item.strengthValue
        ? { value: Number(item.strengthValue), unit: item.unit }
        : null,
      form: item.form,
      frequency: item.frequency,
      times: defaultTimesFor(TIMES_PER_FREQUENCY[item.frequency]),
      durationDays: Number(item.durationDays) || 30,
      instructions: item.instructions.trim(),
    }));

    addPrescription({
      patientId: bundle.patient!.id,
      doctorId: doctor.id,
      appointmentId: params.appointmentId ?? null,
      items: built,
      notes: advice,
    });
    setItems([{ ...emptyItem }]);
    showToast(t('doctor.prescription_saved'));
  };

  const saveTarget = () => {
    if (!targetMin || !targetMax) return;
    setVitalTarget({
      patientId: bundle.patient!.id,
      type: targetType,
      min: Number(targetMin),
      max: Number(targetMax),
      secondaryMin: targetSecondaryMin ? Number(targetSecondaryMin) : null,
      secondaryMax: targetSecondaryMax ? Number(targetSecondaryMax) : null,
      setByDoctorId: doctor.id,
    });
    showToast(t('doctor.target_saved'));
  };

  return (
    <Screen title={`${t('doctor.consult_title')} · ${bundle.patient.fullName}`}>
      <Panel title={t('records.notes')}>
        <Field label={t('records.complaint')}>
          <textarea
            className="textarea"
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
          />
        </Field>
        <Field label={t('records.observations')}>
          <textarea
            className="textarea"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
          />
        </Field>
        <Field label={t('records.advice')}>
          <textarea
            className="textarea"
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
          />
        </Field>
        <Field label={t('doctor.follow_up_date')}>
          <input
            className="input"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
        </Field>
        <button type="button" className="btn btn-primary" onClick={saveNote}>
          <Icon name="note" size={24} />
          {t('doctor.save_note')}
        </button>
      </Panel>

      <Panel title={t('doctor.prescribe')}>
        {items.map((item, index) => (
          <div className="card card-flat card-tight" key={index}>
            <Field label={t('add.name')}>
              <input
                className="input"
                value={item.medicineName}
                onChange={(e) => patchItem(index, { medicineName: e.target.value })}
                placeholder={t('add.name_placeholder')}
              />
            </Field>
            <div className="inline-fields">
              <Field label={t('add.strength')}>
                <input
                  className="input"
                  inputMode="decimal"
                  value={item.strengthValue}
                  onChange={(e) => patchItem(index, { strengthValue: e.target.value })}
                />
              </Field>
              <Field label={t('add.unit')}>
                <select
                  className="select"
                  value={item.unit}
                  onChange={(e) => patchItem(index, { unit: e.target.value as StrengthUnit })}
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('add.form')}>
                <select
                  className="select"
                  value={item.form}
                  onChange={(e) => patchItem(index, { form: e.target.value as DosageForm })}
                >
                  {FORMS.map((form) => (
                    <option key={form} value={form}>
                      {t(`form.${form}` as TranslationKey)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <OptionGroup
              label={t('add.frequency')}
              value={item.frequency}
              onChange={(frequency) => patchItem(index, { frequency })}
              options={FREQUENCIES.map((frequency) => ({
                value: frequency,
                label: t(`freq.${frequency}` as TranslationKey),
              }))}
            />
            <div className="inline-fields">
              <Field label={t('records.duration_days', { days: '' }).trim()}>
                <input
                  className="input"
                  inputMode="numeric"
                  value={item.durationDays}
                  onChange={(e) => patchItem(index, { durationDays: e.target.value })}
                />
              </Field>
              <Field label={t('add.notes', { optional: t('common.optional') })}>
                <input
                  className="input"
                  value={item.instructions}
                  onChange={(e) => patchItem(index, { instructions: e.target.value })}
                  placeholder={t('add.notes_placeholder')}
                />
              </Field>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setItems((current) => [...current, { ...emptyItem }])}
        >
          <Icon name="plus" size={22} />
          {t('doctor.add_item')}
        </button>

        <button type="button" className="btn btn-primary" onClick={savePrescription}>
          {t('doctor.prescribe')}
        </button>
        <p className="footnote">{t('safety.disclaimer')}</p>
      </Panel>

      <Panel title={t('doctor.set_target')}>
        <Field label={t('common.select')}>
          <select
            className="select"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as VitalType)}
          >
            {TARGET_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`vital.${type}` as TranslationKey)} ({VITAL_UNITS[type]})
              </option>
            ))}
          </select>
        </Field>
        <div className="inline-fields">
          <Field label="Min">
            <input
              className="input"
              inputMode="decimal"
              value={targetMin}
              onChange={(e) => setTargetMin(e.target.value)}
            />
          </Field>
          <Field label="Max">
            <input
              className="input"
              inputMode="decimal"
              value={targetMax}
              onChange={(e) => setTargetMax(e.target.value)}
            />
          </Field>
        </div>
        {targetType === 'blood_pressure' && (
          <div className="inline-fields">
            <Field label={`${t('records.secondary_value')} min`}>
              <input
                className="input"
                inputMode="decimal"
                value={targetSecondaryMin}
                onChange={(e) => setTargetSecondaryMin(e.target.value)}
              />
            </Field>
            <Field label={`${t('records.secondary_value')} max`}>
              <input
                className="input"
                inputMode="decimal"
                value={targetSecondaryMax}
                onChange={(e) => setTargetSecondaryMax(e.target.value)}
              />
            </Field>
          </div>
        )}
        <button type="button" className="btn btn-secondary" onClick={saveTarget}>
          {t('doctor.set_target')}
        </button>
      </Panel>

      <button type="button" className="btn btn-ghost" onClick={goBack}>
        {t('common.done')}
      </button>

      <Toast message={toast} />
    </Screen>
  );
}
