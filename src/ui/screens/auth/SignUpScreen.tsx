import { useMemo, useState, type ReactNode } from 'react';

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
import { Icon, type IconName } from '../../components/Icon';

const GENDERS: Gender[] = ['female', 'male', 'other', 'unspecified'];

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** A labelled frosted field. */
function Field({
  label,
  children,
  id,
}: {
  label: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

function RoleCard({
  icon,
  title,
  sub,
  selected,
  onSelect,
}: {
  icon: IconName;
  title: string;
  sub: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="auth-glass-btn"
      aria-pressed={selected}
      onClick={onSelect}
      style={{
        width: '100%',
        justifyContent: 'flex-start',
        minHeight: 84,
        borderRadius: 24,
        textAlign: 'left',
        gap: 14,
      }}
    >
      <Icon name={icon} size={28} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 800 }}>{title}</span>
        <span style={{ display: 'block', fontSize: '0.82em', opacity: 0.82 }}>{sub}</span>
      </span>
    </button>
  );
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
    <section className="screen">
      <div className="auth">
        <div className="auth-head">
          <h1 className="auth-title">{t('auth.signup')}</h1>
          <p className="auth-sub">{stepTitle}</p>
        </div>

        <div className="auth-steps" aria-hidden="true">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <span
              key={index}
              data-state={index < step ? 'done' : index === step ? 'current' : 'todo'}
            />
          ))}
        </div>
        <p className="auth-note">{t('auth.step', { current: step + 1, total: totalSteps })}</p>

        {/* ---------- step 0: role ---------- */}
        {step === 0 && (
          <>
            <RoleCard
              icon="user"
              title={t('auth.role_patient')}
              sub={t('auth.role_patient_sub')}
              selected={role === 'patient'}
              onSelect={() => {
                setRole('patient');
                setStep(1);
              }}
            />
            <RoleCard
              icon="stethoscope"
              title={t('auth.role_doctor')}
              sub={t('auth.role_doctor_sub')}
              selected={role === 'doctor'}
              onSelect={() => {
                setRole('doctor');
                setStep(1);
              }}
            />
            <RoleCard
              icon="hospital"
              title={t('auth.role_admin')}
              sub={t('auth.role_admin_sub')}
              selected={role === 'hospital_admin'}
              onSelect={() => {
                setRole('hospital_admin');
                setStep(1);
              }}
            />
            <button type="button" className="auth-link" onClick={goBack}>
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
                <div className="auth-divider">{t('auth.or_email')}</div>
              </>
            )}
            {usingGoogle && <div className="auth-card">{t('auth.google_new_user')}</div>}

            <Field label={t('auth.full_name')} id="su-name">
              <input
                id="su-name"
                className="auth-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </Field>

            <Field label={t('auth.email')} id="su-email">
              <input
                id="su-email"
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={usingGoogle}
                autoComplete="email"
              />
            </Field>

            <Field label={t('auth.phone')} id="su-phone">
              <input
                id="su-phone"
                className="auth-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </Field>

            {!usingGoogle && (
              <Field label={t('auth.password')} id="su-password">
                <input
                  id="su-password"
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <span className="auth-note" style={{ textAlign: 'left' }}>
                  {t('auth.password_hint')}
                </span>
              </Field>
            )}

            {error && <div className="auth-error">{t(error)}</div>}

            <button
              type="button"
              className="auth-btn"
              disabled={busy}
              onClick={() => (role === 'hospital_admin' ? void submit() : setStep(2))}
            >
              {role === 'hospital_admin' ? t('auth.create_account') : t('auth.next')}
            </button>
            <button type="button" className="auth-link" onClick={() => setStep(0)}>
              {t('common.back')}
            </button>
          </>
        )}

        {/* ---------- step 2a: patient health ---------- */}
        {step === 2 && role === 'patient' && (
          <>
            <Field label={t('profile.dob')} id="su-dob">
              <input
                id="su-dob"
                className="auth-input"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </Field>

            <div className="auth-field">
              <span className="auth-label">{t('profile.gender')}</span>
              <div className="auth-row" style={{ flexWrap: 'wrap' }}>
                {GENDERS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className="auth-glass-btn"
                    aria-pressed={gender === g}
                    onClick={() => setGender(g)}
                    style={{ flex: '1 1 40%' }}
                  >
                    {t(`gender.${g}` as TranslationKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="auth-row">
              <Field label={t('profile.blood_group')} id="su-blood">
                <select
                  id="su-blood"
                  className="auth-input"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                >
                  {BLOOD_GROUPS.map((group) => (
                    <option key={group} value={group} style={{ color: '#1a1930' }}>
                      {group}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('profile.height')} id="su-height">
                <input
                  id="su-height"
                  className="auth-input"
                  inputMode="numeric"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </Field>
              <Field label={t('profile.weight')} id="su-weight">
                <input
                  id="su-weight"
                  className="auth-input"
                  inputMode="decimal"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </Field>
            </div>

            <Field label={t('profile.conditions')} id="su-cond">
              <input
                id="su-cond"
                className="auth-input"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder={t('profile.conditions_hint')}
              />
            </Field>

            <Field label={t('profile.allergies')} id="su-allergy">
              <input
                id="su-allergy"
                className="auth-input"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder={t('profile.allergies_hint')}
              />
            </Field>

            <Field label={t('profile.address')} id="su-address">
              <input
                id="su-address"
                className="auth-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>

            <div className="auth-row">
              <Field label={t('profile.city')} id="su-city">
                <input
                  id="su-city"
                  className="auth-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Field>
              <Field label={t('profile.abha')} id="su-abha">
                <input
                  id="su-abha"
                  className="auth-input"
                  value={abhaId}
                  onChange={(e) => setAbhaId(e.target.value)}
                />
              </Field>
            </div>

            <Field label={t('profile.hospital')} id="su-hospital">
              <select
                id="su-hospital"
                className="auth-input"
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
              >
                {db.hospitals.map((h) => (
                  <option key={h.id} value={h.id} style={{ color: '#1a1930' }}>
                    {h.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t('profile.primary_doctor')} id="su-doctor">
              <select
                id="su-doctor"
                className="auth-input"
                value={primaryDoctorId}
                onChange={(e) => setPrimaryDoctorId(e.target.value)}
              >
                <option value="" style={{ color: '#1a1930' }}>
                  {t('common.none')}
                </option>
                {db.doctors.map((d) => (
                  <option key={d.id} value={d.id} style={{ color: '#1a1930' }}>
                    {d.fullName} — {d.specialization}
                  </option>
                ))}
              </select>
            </Field>

            <div className="auth-row">
              <Field label={t('profile.emergency_name')} id="su-em-name">
                <input
                  id="su-em-name"
                  className="auth-input"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                />
              </Field>
              <Field label={t('profile.emergency_phone')} id="su-em-phone">
                <input
                  id="su-em-phone"
                  className="auth-input"
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                />
              </Field>
            </div>

            {error && <div className="auth-error">{t(error)}</div>}

            <button
              type="button"
              className="auth-btn"
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? t('common.loading') : t('auth.create_account')}
            </button>
            <button type="button" className="auth-link" onClick={() => setStep(1)}>
              {t('common.back')}
            </button>
          </>
        )}

        {/* ---------- step 2b: doctor practice ---------- */}
        {step === 2 && role === 'doctor' && (
          <>
            <Field label={t('practice.specialization')} id="su-spec">
              <select
                id="su-spec"
                className="auth-input"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
              >
                {SPECIALIZATIONS.map((item) => (
                  <option key={item} value={item} style={{ color: '#1a1930' }}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t('practice.registration')} id="su-reg">
              <input
                id="su-reg"
                className="auth-input"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="TN/MC/00000"
              />
            </Field>

            <Field label={t('practice.hospital')} id="su-doc-hospital">
              <select
                id="su-doc-hospital"
                className="auth-input"
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
              >
                {db.hospitals.map((h) => (
                  <option key={h.id} value={h.id} style={{ color: '#1a1930' }}>
                    {h.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t('practice.qualifications')} id="su-qual">
              <input
                id="su-qual"
                className="auth-input"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                placeholder="MBBS, MD"
              />
            </Field>

            <div className="auth-row">
              <Field label={t('practice.experience')} id="su-exp">
                <input
                  id="su-exp"
                  className="auth-input"
                  inputMode="numeric"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                />
              </Field>
              <Field label={t('practice.fee')} id="su-fee">
                <input
                  id="su-fee"
                  className="auth-input"
                  inputMode="numeric"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                />
              </Field>
              <Field label={t('practice.room')} id="su-room">
                <input
                  id="su-room"
                  className="auth-input"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </Field>
            </div>

            <Field label={t('practice.languages')} id="su-lang">
              <input
                id="su-lang"
                className="auth-input"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder={t('profile.allergies_hint')}
              />
            </Field>

            {error && <div className="auth-error">{t(error)}</div>}

            <button
              type="button"
              className="auth-btn"
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? t('common.loading') : t('auth.create_account')}
            </button>
            <button type="button" className="auth-link" onClick={() => setStep(1)}>
              {t('common.back')}
            </button>
          </>
        )}

        <p className="auth-note">{t('auth.security_note')}</p>
      </div>
    </section>
  );
}
