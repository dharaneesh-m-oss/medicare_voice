import { useMemo, useState } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import { nextWorkingDays } from '../../../core/clinic/AppointmentService';
import { formatDateLong } from '../../../core/utils/date';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { SafetyNote } from '../../components/common';
import { Avatar, Chip, EmptyState, SearchInput } from '../../components/kit';

/** A doctor counts as "new" for two weeks after they register. */
const NEW_FOR_DAYS = 14;

export function DoctorsScreen() {
  const { t, locale, db, patient, hospital } = useApp();
  const { navigate } = useNavigator();
  const [query, setQuery] = useState('');

  /**
   * Reads straight from `db.doctors`, so a doctor who signs up appears here for
   * every patient immediately — no directory to sync, nothing to publish.
   */
  const doctors = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const now = new Date();
    return db.doctors
      .filter(
        (doctor) =>
          !needle ||
          doctor.fullName.toLowerCase().includes(needle) ||
          doctor.specialization.toLowerCase().includes(needle),
      )
      .map((doctor) => {
        const days = nextWorkingDays(doctor, 1, now);
        const ageMs = now.getTime() - new Date(doctor.createdAt).getTime();
        return {
          doctor,
          nextDay: days[0] ?? null,
          isNew: ageMs < NEW_FOR_DAYS * 86_400_000,
          isMine: patient?.primaryDoctorId === doctor.id,
        };
      })
      // Your own doctor first, then the newest arrivals.
      .sort((a, b) => {
        if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
        if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
        return a.doctor.fullName.localeCompare(b.doctor.fullName);
      });
  }, [db.doctors, query, patient?.primaryDoctorId]);

  return (
    <Screen title={t('doctors.title')}>
      <p className="muted" style={{ margin: 0 }}>
        {t('doctors.subtitle', { hospital: hospital?.name ?? '' })}
      </p>

      <SearchInput value={query} onChange={setQuery} placeholder={t('doctors.search')} />

      {doctors.length === 0 && <EmptyState message={t('doctors.none')} />}

      {doctors.map(({ doctor, nextDay, isNew, isMine }) => (
        <div className="card" key={doctor.id}>
          <div className="row">
            <Avatar name={doctor.fullName} large plain />
            <div className="stack-sm" style={{ flex: 1, minWidth: 0 }}>
              <span className="big-value">{doctor.fullName}</span>
              <span className="muted">
                {doctor.specialization} · {doctor.qualifications}
              </span>
              <span className="chip-row">
                {isMine && <Chip tone="success">{t('doctors.your_doctor')}</Chip>}
                {isNew && <Chip tone="violet">{t('doctors.new')}</Chip>}
                <Chip>{t('book.experience', { years: doctor.experienceYears })}</Chip>
              </span>
            </div>
          </div>

          <span className="muted">
            {t('doctors.speaks', { languages: doctor.languages.join(', ') })}
            {doctor.roomNumber ? ` · ${doctor.roomNumber}` : ''}
          </span>

          <div className="row">
            <span style={{ fontWeight: 700 }}>
              {nextDay
                ? t('doctors.next_available', { date: formatDateLong(nextDay, locale) })
                : t('doctors.none_available')}
            </span>
            <Chip tone="primary">{t('book.fee', { amount: `₹${doctor.consultationFee}` })}</Chip>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            disabled={!nextDay}
            onClick={() => navigate('book', { doctorId: doctor.id })}
          >
            <Icon name="calendar" size={24} />
            {t('doctors.book')}
          </button>
        </div>
      ))}

      <SafetyNote />
    </Screen>
  );
}
