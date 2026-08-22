import { useMemo, useState } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import type { DoctorDraft, PatientDraft } from '../../../core/auth/AuthService';
import type { GoogleProfile } from '../../../core/auth/GoogleAuthProvider';
import {
  BLOOD_GROUPS,
  SPECIALIZATIONS,
  type BloodGroup,
  type Gender,
  type Role,
} from '../../../core/auth/types';
import type { TranslationKey } from '../../../core/i18n';
import { GoogleButton } from '../../components/GoogleButton';
import { Screen } from '../../components/Screen';
import { Field, OptionGroup, Tile } from '../../components/common';

const GENDERS: Gender[] = ['female', 'male', 'other', 'unspecified'];

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function SignUpScreen() {
  const { t, db, signUp } = useApp();
  const { params, goBack } = useNavigator();

  const [step, setStep] = useState(params.googleEmail ? 1 : 0);
  const [role, setRole] = useState<Role>(params.signUpRole ?? 'patient');

  /* account */
  const [fullName, setFullName] = useState(params.googleName ?? '');
  const [email, setEmail] = useState(params.googleEmail ?? '');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [googleSubject, setGoogleSubject] = useState(params.googleSubject ?? '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(params.googlePhoto ?? null);

  /* patient */
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>('unspecified');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('unknown');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [primaryDoctorId, setPrimaryDoctorId] = useState('');
  const [hospitalId, setHospitalId] = useState(db.hospitals[0]?.id ?? '');
  const [abhaId, setAbhaId] = useState('');

  /* doctor */
  const [specialization, setSpecialization] = useState<string>(SPECIALIZATIONS[0]);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [languages, setLanguages] = useState('English');
  const [consultationFee, setConsultationFee] = useState('400');
  const [roomNumber, setRoomNumber] = useState('');

  const [error, setError] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);

  const usingGoogle = Boolean(googleSubject);
  const totalSteps = role === 'hospital_admin' ? 2 : 3;

  const onGoogle = (profile: GoogleProfile) => {
    setGoogleSubject(profile.subject);
    setEmail(profile.email);
    setFullName((current) => current || profile.fullName);
    setPhotoUrl(profile.photoUrl);
    setStep(1);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);

    const patient: PatientDraft = {
      dateOfBirth: dateOfBirth || null,
      gender,
      bloodGroup,
      heightCm: heightCm ? Number(heightCm) : null,
      weightKg: weightKg ? Number(weightKg) : null,
      address,
      city,
      allergies: splitList(allergies),
      conditions: splitList(conditions),
      emergencyContactName: emergencyName,
      emergencyContactPhone: emergencyPhone,
      primaryDoctorId: primaryDoctorId || null,
      hospitalId: hospitalId || null,
      abhaId: abhaId || null,
    };

    const doctor: DoctorDraft = {
      specialization,
      registrationNumber,
      hospitalId,
      qualifications,
      experienceYears: Number(experienceYears) || 0,
      languages: splitList(languages),
      consultationFee: Number(consultationFee) || 0,
      roomNumber,
    };

    const result = await signUp({
      role,
      fullName,
      email,
      phone,
      password: usingGoogle ? undefined : password,
      provider: usingGoogle ? 'google' : 'local',
      googleSubject: usingGoogle ? googleSubject : undefined,
      photoUrl,
      patient: role === 'patient' ? patient : undefined,
      doctor: role === 'doctor' ? doctor : undefined,
    });

    setBusy(false);
    if (!result.ok) {
      setError(`auth.error_${result.error}` as TranslationKey);
      setStep(result.error === 'email_taken' || result.error === 'invalid_email' ? 1 : step);
    }
    // On success the route guard in <Shell> lands the user on their role's home.
  };

  const stepTitle = useMemo(() => {
    if (step === 0) return t('auth.role_question');
    if (step === 1) return t('auth.step_account');
    return role === 'doctor' ? t('auth.step_practice') : t('auth.step_health');
  }, [step, role, t]);

  return (
    <Screen title={t('auth.signup')}>
      <div className="stepper" aria-hidden="true">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <span
            key={index}
            className="stepper-dot"
            data-state={index < step ? 'done' : index === step ? 'current' : 'todo'}
          />
        ))}
      </div>
      <span className="muted">
        {t('auth.step', { current: step + 1, total: totalSteps })} · {stepTitle}
      </span>

      {/* ---------- step 0: role ---------- */}
      {step === 0 && (
        <>
          <Tile
            icon="user"
            label={t('auth.role_patient')}
            sub={t('auth.role_patient_sub')}
            primary={role === 'patient'}
            onClick={() => {
              setRole('patient');
              setStep(1);
            }}
          />
          <Tile
            icon="stethoscope"
            label={t('auth.role_doctor')}
            sub={t('auth.role_doctor_sub')}
            primary={role === 'doctor'}
            onClick={() => {
              setRole('doctor');
              setStep(1);
            }}
          />
          <Tile
            icon="hospital"
            label={t('auth.role_admin')}
            sub={t('auth.role_admin_sub')}
            primary={role === 'hospital_admin'}
            onClick={() => {
              setRole('hospital_admin');
              setStep(1);
            }}
          />
          <button type="button" className="btn btn-ghost" onClick={goBack}>
            {t('common.cancel')}
          </button>
        </>
      )}

      {/* ---------- step 1: account ---------- */}
      {step === 1 && (
        <>
          {!usingGoogle && (
            <>
              <GoogleButton text="signup_with" onProfile={onGoogle} />
              <div className="divider-text">{t('auth.or_email')}</div>
            </>
          )}
          {usingGoogle && <div className="banner banner-success">{t('auth.google_new_user')}</div>}

          <Field label={t('auth.full_name')}>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </Field>

          <Field label={t('auth.email')}>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={usingGoogle}
              autoComplete="email"
            />
          </Field>

          <Field label={t('auth.phone')}>
            <input
              className="input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </Field>

          {!usingGoogle && (
            <Field label={t('auth.password')}>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <span className="muted">{t('auth.password_hint')}</span>
            </Field>
          )}

          {error && <div className="banner banner-danger">{t(error)}</div>}

          <button
            type="button"
            className="btn btn-lg btn-primary"
            onClick={() => (role === 'hospital_admin' ? void submit() : setStep(2))}
            disabled={busy}
          >
            {role === 'hospital_admin' ? t('auth.create_account') : t('auth.next')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>
            {t('common.back')}
          </button>
        </>
      )}

      {/* ---------- step 2a: patient health ---------- */}
      {step === 2 && role === 'patient' && (
        <>
          <Field label={t('profile.dob')}>
            <input
              className="input"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </Field>

          <OptionGroup
            label={t('profile.gender')}
            value={gender}
            onChange={setGender}
            options={GENDERS.map((g) => ({ value: g, label: t(`gender.${g}` as TranslationKey) }))}
          />

          <div className="inline-fields">
            <Field label={t('profile.blood_group')}>
              <select
                className="select"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
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
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </Field>
            <Field label={t('profile.weight')}>
              <input
                className="input"
                inputMode="decimal"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </Field>
          </div>

          <Field label={t('profile.conditions')}>
            <input
              className="input"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder={t('profile.conditions_hint')}
            />
          </Field>

          <Field label={t('profile.allergies')}>
            <input
              className="input"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder={t('profile.allergies_hint')}
            />
          </Field>

          <Field label={t('profile.address')}>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>

          <div className="inline-fields">
            <Field label={t('profile.city')}>
              <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <Field label={t('profile.abha')}>
              <input className="input" value={abhaId} onChange={(e) => setAbhaId(e.target.value)} />
            </Field>
          </div>

          <Field label={t('profile.hospital')}>
            <select
              className="select"
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
            >
              {db.hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('profile.primary_doctor')}>
            <select
              className="select"
              value={primaryDoctorId}
              onChange={(e) => setPrimaryDoctorId(e.target.value)}
            >
              <option value="">{t('common.none')}</option>
              {db.doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} — {d.specialization}
                </option>
              ))}
            </select>
          </Field>

          <div className="inline-fields">
            <Field label={t('profile.emergency_name')}>
              <input
                className="input"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
              />
            </Field>
            <Field label={t('profile.emergency_phone')}>
              <input
                className="input"
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
              />
            </Field>
          </div>

          {error && <div className="banner banner-danger">{t(error)}</div>}

          <button
            type="button"
            className="btn btn-lg btn-primary"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? t('common.loading') : t('auth.create_account')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
            {t('common.back')}
          </button>
        </>
      )}

      {/* ---------- step 2b: doctor practice ---------- */}
      {step === 2 && role === 'doctor' && (
        <>
          <Field label={t('practice.specialization')}>
            <select
              className="select"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
            >
              {SPECIALIZATIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('practice.registration')}>
            <input
              className="input"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="TN/MC/00000"
            />
          </Field>

          <Field label={t('practice.hospital')}>
            <select
              className="select"
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
            >
              {db.hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('practice.qualifications')}>
            <input
              className="input"
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              placeholder="MBBS, MD"
            />
          </Field>

          <div className="inline-fields">
            <Field label={t('practice.experience')}>
              <input
                className="input"
                inputMode="numeric"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            </Field>
            <Field label={t('practice.fee')}>
              <input
                className="input"
                inputMode="numeric"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
              />
            </Field>
            <Field label={t('practice.room')}>
              <input
                className="input"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
              />
            </Field>
          </div>

          <Field label={t('practice.languages')}>
            <input
              className="input"
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder={t('profile.allergies_hint')}
            />
          </Field>

          {error && <div className="banner banner-danger">{t(error)}</div>}

          <button
            type="button"
            className="btn btn-lg btn-primary"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? t('common.loading') : t('auth.create_account')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
            {t('common.back')}
          </button>
        </>
      )}

      <p className="footnote">{t('auth.security_note')}</p>
    </Screen>
  );
}
