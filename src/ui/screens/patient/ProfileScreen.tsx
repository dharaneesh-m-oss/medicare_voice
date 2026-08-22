import { useState } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import { ageFrom, bmiFrom, BLOOD_GROUPS, type BloodGroup } from '../../../core/auth/types';
import type { TranslationKey } from '../../../core/i18n';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Field, SafetyNote } from '../../components/common';
import { Avatar, Chip, KeyValue, Panel, RowItem, Toast, useToast } from '../../components/kit';

export function ProfileScreen() {
  const {
    t,
    locale,
    db,
    account,
    patient,
    doctor,
    hospital,
    updatePatientProfile,
    updateDoctorProfile,
    signOut,
  } = useApp();
  const { navigate } = useNavigator();
  const [editing, setEditing] = useState(false);
  const [toast, showToast] = useToast();

  if (!account) return null;

  const age = ageFrom(patient?.dateOfBirth ?? null);
  const bmi = bmiFrom(patient?.heightCm ?? null, patient?.weightKg ?? null);
  const primaryDoctor = db.doctors.find((d) => d.id === patient?.primaryDoctorId) ?? null;

  return (
    <Screen title={t('profile.title')}>
      <div className="card">
        <div className="row">
          <Avatar name={account.fullName} photoUrl={account.photoUrl} large plain />
          <div className="stack-sm" style={{ flex: 1, minWidth: 0 }}>
            <span className="big-value">{account.fullName}</span>
            <span className="muted">{account.email}</span>
            <span className="chip-row">
              <Chip tone="primary">{t(`auth.role_${account.role === 'hospital_admin' ? 'admin' : account.role}` as TranslationKey)}</Chip>
              {account.provider === 'google' && <Chip>Google</Chip>}
            </span>
          </div>
        </div>
      </div>

      {/* ---------------- patient ---------------- */}
      {patient && (
        <>
          <Panel
            title={t('profile.personal')}
            action={
              <button type="button" className="link-button" onClick={() => setEditing((v) => !v)}>
                {editing ? t('common.close') : t('common.edit')}
              </button>
            }
          >
            {!editing ? (
              <KeyValue
                rows={[
                  { label: t('profile.age'), value: age !== null ? t('profile.years', { count: age }) : '—' },
                  { label: t('profile.gender'), value: t(`gender.${patient.gender}` as TranslationKey) },
                  { label: t('profile.blood_group'), value: patient.bloodGroup },
                  { label: t('profile.bmi'), value: bmi ?? '—' },
                  { label: t('auth.phone'), value: patient.phone || '—' },
                  { label: t('profile.address'), value: `${patient.address}${patient.city ? ', ' + patient.city : ''}` || '—' },
                  { label: t('profile.abha'), value: patient.abhaId ?? '—' },
                ]}
              />
            ) : (
              <>
                <Field label={t('profile.dob')}>
                  <input
                    className="input"
                    type="date"
                    value={patient.dateOfBirth ?? ''}
                    onChange={(e) => updatePatientProfile({ dateOfBirth: e.target.value || null })}
                  />
                </Field>
                <div className="inline-fields">
                  <Field label={t('profile.blood_group')}>
                    <select
                      className="select"
                      value={patient.bloodGroup}
                      onChange={(e) =>
                        updatePatientProfile({ bloodGroup: e.target.value as BloodGroup })
                      }
                    >
                      {BLOOD_GROUPS.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t('profile.height')}>
                    <input
                      className="input"
                      inputMode="numeric"
                      value={patient.heightCm ?? ''}
                      onChange={(e) =>
                        updatePatientProfile({ heightCm: Number(e.target.value) || null })
                      }
                    />
                  </Field>
                  <Field label={t('profile.weight')}>
                    <input
                      className="input"
                      inputMode="decimal"
                      value={patient.weightKg ?? ''}
                      onChange={(e) =>
                        updatePatientProfile({ weightKg: Number(e.target.value) || null })
                      }
                    />
                  </Field>
                </div>
                <Field label={t('profile.address')}>
                  <input
                    className="input"
                    value={patient.address}
                    onChange={(e) => updatePatientProfile({ address: e.target.value })}
                  />
                </Field>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setEditing(false);
                    showToast(t('profile.saved'));
                  }}
                >
                  {t('common.save')}
                </button>
              </>
            )}
          </Panel>

          <Panel title={t('profile.health')}>
            <KeyValue
              rows={[
                {
                  label: t('profile.conditions'),
                  value:
                    patient.conditions.length > 0
                      ? patient.conditions.join(', ')
                      : t('doctor.none_recorded'),
                },
                {
                  label: t('profile.allergies'),
                  value:
                    patient.allergies.length > 0
                      ? patient.allergies.join(', ')
                      : t('doctor.none_recorded'),
                },
                {
                  label: t('profile.primary_doctor'),
                  value: primaryDoctor
                    ? `${primaryDoctor.fullName} · ${primaryDoctor.specialization}`
                    : '—',
                },
                { label: t('profile.hospital'), value: hospital?.name ?? '—' },
              ]}
            />
          </Panel>

          <Panel title={t('profile.emergency')}>
            <KeyValue
              rows={[
                { label: t('profile.emergency_name'), value: patient.emergencyContactName || '—' },
                {
                  label: t('profile.emergency_phone'),
                  value: patient.emergencyContactPhone || '—',
                },
              ]}
            />
          </Panel>
        </>
      )}

      {/* ---------------- doctor ---------------- */}
      {doctor && (
        <Panel title={t('auth.step_practice')}>
          <KeyValue
            rows={[
              { label: t('practice.specialization'), value: doctor.specialization },
              { label: t('practice.registration'), value: doctor.registrationNumber },
              { label: t('practice.qualifications'), value: doctor.qualifications },
              {
                label: t('practice.experience'),
                value: t('profile.years', { count: doctor.experienceYears }),
              },
              { label: t('practice.fee'), value: `₹${doctor.consultationFee}` },
              { label: t('practice.room'), value: doctor.roomNumber || '—' },
              { label: t('practice.languages'), value: doctor.languages.join(', ') },
              { label: t('practice.hospital'), value: hospital?.name ?? '—' },
            ]}
          />
          <Field label={t('practice.fee')}>
            <input
              className="input"
              inputMode="numeric"
              value={doctor.consultationFee}
              onChange={(e) =>
                updateDoctorProfile({ consultationFee: Number(e.target.value) || 0 })
              }
            />
          </Field>
        </Panel>
      )}

      {hospital && !patient && !doctor && (
        <Panel title={t('profile.hospital')}>
          <KeyValue
            rows={[
              { label: t('common.name'), value: hospital.name },
              { label: t('profile.address'), value: `${hospital.address}` },
              { label: t('auth.phone'), value: hospital.phone },
              { label: t('hospital.department'), value: hospital.departments.join(', ') },
            ]}
          />
        </Panel>
      )}

      {/* Everything that does not need its own tab lives under "More". */}
      {patient && (
        <Panel title={t('nav.more')} flush>
          <RowItem
            leading={<Icon name="pills" size={26} />}
            title={t('home.medicines')}
            sub={t('home.medicines_sub')}
            onClick={() => navigate('medicines')}
          />
          <RowItem
            leading={<Icon name="history" size={26} />}
            title={t('home.history')}
            sub={t('home.history_sub')}
            onClick={() => navigate('history')}
          />
          <RowItem
            leading={<Icon name="note" size={26} />}
            title={t('records.title')}
            sub={t('records.prescriptions')}
            onClick={() => navigate('records')}
          />
          <RowItem
            leading={<Icon name="activity" size={26} />}
            title={t('wellness.title')}
            sub={t('wellbeing.quick_log')}
            onClick={() => navigate('wellness')}
          />
          <RowItem
            leading={<Icon name="play" size={26} />}
            title={t('home.demo')}
            sub={t('home.demo_sub')}
            onClick={() => navigate('demo')}
          />
        </Panel>
      )}

      <button type="button" className="btn btn-secondary" onClick={() => navigate('settings')}>
        <Icon name="settings" size={24} />
        {t('settings.title')}
      </button>

      <button
        type="button"
        className="btn btn-danger"
        onClick={() => {
          signOut();
        }}
      >
        <Icon name="logout" size={24} />
        {t('auth.sign_out')}
      </button>

      <p className="footnote">
        {t('auth.signed_in_as')} {account.email} ·{' '}
        {new Date(account.createdAt).toLocaleDateString(locale)}
      </p>

      <SafetyNote />
      <Toast message={toast} />
    </Screen>
  );
}
