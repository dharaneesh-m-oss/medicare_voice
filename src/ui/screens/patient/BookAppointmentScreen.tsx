import { useMemo, useState } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import {
  generateSlots,
  nextWorkingDays,
} from '../../../core/clinic/AppointmentService';
import { APPOINTMENT_REASONS, type AppointmentMode } from '../../../core/clinic/types';
import type { TranslationKey } from '../../../core/i18n';
import { formatTime12h, fromISODate } from '../../../core/utils/date';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Field, OptionGroup, SafetyNote } from '../../components/common';
import { Avatar, Chip, EmptyState, RowItem, Toast, useToast } from '../../components/kit';

const MODES: AppointmentMode[] = ['in_person', 'video', 'home_visit'];

export function BookAppointmentScreen() {
  const { t, locale, db, session, account, patient, bookAppointment } = useApp();
  const { goBack, params } = useNavigator();
  const [toast, showToast] = useToast();

  const [doctorId, setDoctorId] = useState(
    params.doctorId ?? patient?.primaryDoctorId ?? db.doctors[0]?.id ?? '',
  );
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [mode, setMode] = useState<AppointmentMode>('in_person');
  const [reason, setReason] = useState(APPOINTMENT_REASONS[0] as string);
  const [error, setError] = useState<TranslationKey | null>(null);

  const doctor = db.doctors.find((d) => d.id === doctorId) ?? null;

  const days = useMemo(
    () => (doctor ? nextWorkingDays(doctor, 8) : []),
    [doctor],
  );
  const activeDate = date || days[0] || '';

  const slots = useMemo(
    () => (doctor && activeDate ? generateSlots(doctor, activeDate, db.appointments) : []),
    [doctor, activeDate, db.appointments],
  );

  // The desk books on a patient's behalf by passing their id in; a patient
  // booking for themselves falls back to their own session.
  const targetPatientId = params.patientId ?? session?.patientId ?? null;
  const bookingForSomeoneElse = Boolean(params.patientId) && session?.role !== 'patient';
  const targetName = db.patients.find((p) => p.id === targetPatientId)?.fullName ?? '';

  const confirm = () => {
    if (!doctor || !targetPatientId || !account) return;
    setError(null);
    const result = bookAppointment({
      patientId: targetPatientId,
      doctor,
      date: activeDate,
      time,
      mode,
      reason,
      createdByAccountId: account.id,
      // Reception and doctors book straight into a confirmed slot.
      autoConfirm: session?.role !== 'patient',
    });
    if (!result.ok) {
      setError(`book.error_${result.error}` as TranslationKey);
      return;
    }
    showToast(t('book.booked'));
    window.setTimeout(goBack, 900);
  };

  const dayLabel = (iso: string) =>
    fromISODate(iso).toLocaleDateString(locale, { weekday: 'short' });
  const dayNumber = (iso: string) =>
    fromISODate(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  return (
    <Screen title={t('book.title')}>
      {bookingForSomeoneElse && (
        <div className="banner banner-success">
          <Icon name="user" size={22} />
          <span>{targetName}</span>
        </div>
      )}

      <h2 className="section-title">{t('book.choose_doctor')}</h2>
      <div className="panel" style={{ padding: 0 }}>
        {db.doctors.map((item) => (
          <RowItem
            key={item.id}
            leading={<Avatar name={item.fullName} plain />}
            title={item.fullName}
            sub={`${item.specialization} · ${t('book.experience', { years: item.experienceYears })}`}
            side={
              <>
                <Chip tone={item.id === doctorId ? 'primary' : 'default'}>
                  {t('book.fee', { amount: `₹${item.consultationFee}` })}
                </Chip>
                {item.id === doctorId && <Icon name="check" size={22} />}
              </>
            }
            onClick={() => {
              setDoctorId(item.id);
              setDate('');
              setTime('');
            }}
          />
        ))}
      </div>

      <h2 className="section-title">{t('book.choose_date')}</h2>
      <div className="day-strip">
        {days.map((iso) => (
          <button
            key={iso}
            type="button"
            className="day-chip"
            aria-pressed={iso === activeDate}
            onClick={() => {
              setDate(iso);
              setTime('');
            }}
          >
            <small>{dayLabel(iso)}</small>
            <strong>{dayNumber(iso)}</strong>
          </button>
        ))}
      </div>

      <h2 className="section-title">{t('book.choose_time')}</h2>
      {slots.length === 0 ? (
        <EmptyState message={t('book.no_slots')} />
      ) : (
        <div className="slot-grid">
          {slots.map((slot) => (
            <button
              key={slot.time}
              type="button"
              className="slot"
              aria-pressed={slot.time === time}
              disabled={!slot.available}
              onClick={() => setTime(slot.time)}
            >
              {formatTime12h(slot.time)}
            </button>
          ))}
        </div>
      )}

      <OptionGroup
        label={t('appointments.mode')}
        value={mode}
        onChange={setMode}
        options={MODES.map((item) => ({
          value: item,
          label: t(`mode.${item}` as TranslationKey),
        }))}
      />

      <Field label={t('appointments.reason')}>
        <input
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('book.reason_placeholder')}
          list="reason-options"
        />
        <datalist id="reason-options">
          {APPOINTMENT_REASONS.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </Field>

      {error && <div className="banner banner-danger">{t(error)}</div>}

      <button
        type="button"
        className="btn btn-lg btn-primary"
        disabled={!doctor || !time}
        onClick={confirm}
      >
        <Icon name="check" size={26} />
        {t('book.confirm')}
      </button>

      <SafetyNote />
      <Toast message={toast} />
    </Screen>
  );
}
