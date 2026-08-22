import { useMemo } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import { dayQueue } from '../../../core/clinic/AppointmentService';
import type { TranslationKey } from '../../../core/i18n';
import { formatTime12h, toISODate } from '../../../core/utils/date';
import { Avatar, Chip, Panel, RowItem, Stat } from '../../components/kit';

export function HospitalDoctorsScreen() {
  const { t, db, hospital } = useApp();
  const { navigate } = useNavigator();

  const today = toISODate(new Date());

  const rows = useMemo(
    () =>
      db.doctors.map((doctor) => ({
        doctor,
        todayCount: dayQueue(db.appointments, doctor.id, today).length,
      })),
    [db.doctors, db.appointments, today],
  );

  return (
    <div className="page page-pro">
      <div className="page-head">
        <div>
          <h2>{t('hospital.doctors')}</h2>
          <span className="muted">{hospital?.name}</span>
        </div>
      </div>

      <div className="stat-grid">
        {(hospital?.departments ?? []).map((department) => (
          <Stat
            key={department}
            label={department}
            value={db.doctors.filter((d) => d.specialization === department).length}
            accent="violet"
          />
        ))}
      </div>

      <Panel title={t('hospital.doctors')} flush>
        {rows.map(({ doctor, todayCount }) => (
          <RowItem
            key={doctor.id}
            leading={<Avatar name={doctor.fullName} plain />}
            title={doctor.fullName}
            sub={`${doctor.specialization} · ${doctor.qualifications} · ${doctor.registrationNumber}`}
            side={
              <>
                <Chip tone="primary">
                  {todayCount} {t('common.today').toLowerCase()}
                </Chip>
                <span className="muted">
                  {doctor.availability
                    .slice(0, 2)
                    .map(
                      (window) =>
                        `${t(`day.${window.weekday}` as TranslationKey).slice(0, 3)} ${formatTime12h(
                          window.start,
                        )}`,
                    )
                    .join(' · ')}
                </span>
              </>
            }
            onClick={() => navigate('book', { doctorId: doctor.id })}
          />
        ))}
      </Panel>
    </div>
  );
}
