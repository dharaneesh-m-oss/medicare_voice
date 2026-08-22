import { useMemo, useState } from 'react';

import { useApp } from '../../app/AppState';
import { useNavigator } from '../../app/Navigator';
import type { TranslationKey } from '../../core/i18n';
import { defaultTimesFor } from '../../core/scheduler/MedicationScheduler';
import {
  TIMES_PER_FREQUENCY,
  createId,
  type DosageForm,
  type Frequency,
  type Medicine,
  type ScheduleEntry,
  type Strength,
  type StrengthUnit,
} from '../../core/types';
import { printedToExpiry, timeToMinutes, toISODate } from '../../core/utils/date';
import { Screen } from '../components/Screen';
import { Field, OptionGroup, SafetyNote, ToggleRow } from '../components/common';

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

export function AddMedicineScreen() {
  const { t, addMedicine, addSchedule } = useApp();
  const { params, goBack } = useNavigator();

  const [name, setName] = useState(params.prefillName ?? '');
  const [strengthValue, setStrengthValue] = useState(params.prefillStrength ?? '');
  const [unit, setUnit] = useState<StrengthUnit>((params.prefillUnit as StrengthUnit) ?? 'mg');
  const [form, setForm] = useState<DosageForm>((params.prefillForm as DosageForm) ?? 'tablet');
  const [expiry, setExpiry] = useState(params.prefillExpiry ?? '');
  const [frequency, setFrequency] = useState<Frequency>('once_daily');
  const [times, setTimes] = useState<string[]>(defaultTimesFor(1));
  const [weekday, setWeekday] = useState(1);
  const [notes, setNotes] = useState('');
  const [scheduleIt, setScheduleIt] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; time?: string }>({});

  const timeCount = TIMES_PER_FREQUENCY[frequency];

  const weekdayOptions = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5, 6].map((d) => ({
        value: String(d),
        label: t(`day.${d}` as TranslationKey),
      })),
    [t],
  );

  const changeFrequency = (next: Frequency) => {
    setFrequency(next);
    setTimes(defaultTimesFor(TIMES_PER_FREQUENCY[next]));
  };

  const updateTime = (index: number, value: string) => {
    setTimes((prev) => prev.map((time, i) => (i === index ? value : time)));
  };

  const save = () => {
    const nextErrors: typeof errors = {};
    if (!name.trim()) nextErrors.name = t('add.error_name');
    if (scheduleIt && times.slice(0, timeCount).some((time) => timeToMinutes(time) === null)) {
      nextErrors.time = t('add.error_time');
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const parsed = Number(strengthValue);
    const strength: Strength | null =
      strengthValue.trim() && !Number.isNaN(parsed) ? { value: parsed, unit } : null;

    const medicine: Omit<Medicine, 'patientId'> = {
      id: createId('med'),
      name: name.trim(),
      strength,
      form,
      expiry: printedToExpiry(expiry),
      notes: notes.trim() || undefined,
      addedAt: new Date().toISOString(),
    };
    addMedicine(medicine);

    if (scheduleIt) {
      const entry: Omit<ScheduleEntry, 'patientId'> = {
        id: createId('sch'),
        medicineName: medicine.name,
        strength,
        form,
        frequency,
        times: times.slice(0, timeCount).sort(),
        startDate: toISODate(new Date()),
        weekday: frequency === 'weekly' ? weekday : null,
        notes: medicine.notes,
        active: true,
        createdAt: new Date().toISOString(),
      };
      addSchedule(entry);
    }

    goBack();
  };

  return (
    <Screen title={t('add.title')}>
      <Field label={t('add.name')} error={errors.name}>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('add.name_placeholder')}
          autoComplete="off"
        />
      </Field>

      <div className="inline-fields">
        <Field label={t('add.strength')}>
          <input
            className="input"
            value={strengthValue}
            onChange={(e) => setStrengthValue(e.target.value)}
            inputMode="decimal"
            placeholder={t('add.strength_placeholder')}
          />
        </Field>
        <Field label={t('add.unit')}>
          <select
            className="select"
            value={unit}
            onChange={(e) => setUnit(e.target.value as StrengthUnit)}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <OptionGroup
        label={t('add.form')}
        value={form}
        onChange={(value) => setForm(value)}
        options={FORMS.map((f) => ({ value: f, label: t(`form.${f}` as TranslationKey) }))}
      />

      <Field label={t('add.expiry', { optional: t('common.optional') })}>
        <input
          className="input"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          placeholder="MM/YYYY"
          inputMode="numeric"
        />
      </Field>

      <div className="card card-flat">
        <ToggleRow
          label={t('add.also_schedule')}
          checked={scheduleIt}
          onChange={setScheduleIt}
        />

        {scheduleIt && (
          <>
            <OptionGroup
              label={t('add.frequency')}
              value={frequency}
              onChange={changeFrequency}
              options={FREQUENCIES.map((f) => ({
                value: f,
                label: t(`freq.${f}` as TranslationKey),
              }))}
            />

            {frequency === 'weekly' && (
              <OptionGroup
                label={t('add.weekday')}
                value={String(weekday)}
                onChange={(value) => setWeekday(Number(value))}
                options={weekdayOptions}
              />
            )}

            {timeCount > 0 && (
              <div className="stack">
                <span className="field-label">{t('add.times')}</span>
                {Array.from({ length: timeCount }).map((_, index) => (
                  <Field
                    key={index}
                    label={t('add.time_label', { index: index + 1 })}
                    error={index === 0 ? errors.time : undefined}
                  >
                    <input
                      className="input"
                      type="time"
                      value={times[index] ?? ''}
                      onChange={(e) => updateTime(index, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Field label={t('add.notes', { optional: t('common.optional') })}>
        <textarea
          className="textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('add.notes_placeholder')}
        />
      </Field>

      <button type="button" className="btn btn-lg btn-primary" onClick={save}>
        {t('add.save')}
      </button>
      <button type="button" className="btn btn-ghost" onClick={goBack}>
        {t('common.cancel')}
      </button>

      <SafetyNote />
    </Screen>
  );
}
