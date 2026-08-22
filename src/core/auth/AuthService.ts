/**
 * ACCOUNT SERVICE.
 *
 * Pure-ish functions over the Database document: they take the current database
 * and return the next one plus a session, so the React layer stays a thin
 * dispatcher. Swapping this for a real backend means replacing this file and
 * keeping the same signatures.
 */

import type { Database } from '../storage/Database';
import { createId, DEFAULT_SETTINGS } from '../types';
import { DEFAULT_WELLNESS_GOAL } from '../wellness/types';
import { hashPassword, randomSalt, safeEqual } from './crypto';
import type {
  Account,
  AuthProviderId,
  BloodGroup,
  DoctorProfile,
  Gender,
  PatientProfile,
  Role,
  Session,
} from './types';

export type AuthError =
  | 'email_taken'
  | 'invalid_credentials'
  | 'invalid_email'
  | 'weak_password'
  | 'name_required'
  | 'hospital_required'
  | 'registration_required';

export type AuthResult =
  | { ok: true; db: Database; session: Session; account: Account }
  | { ok: false; error: AuthError };

export interface PatientDraft {
  dateOfBirth: string | null;
  gender: Gender;
  bloodGroup: BloodGroup;
  heightCm: number | null;
  weightKg: number | null;
  address: string;
  city: string;
  allergies: string[];
  conditions: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  primaryDoctorId: string | null;
  hospitalId: string | null;
  abhaId: string | null;
}

export interface DoctorDraft {
  specialization: string;
  registrationNumber: string;
  hospitalId: string;
  qualifications: string;
  experienceYears: number;
  languages: string[];
  consultationFee: number;
  roomNumber: string;
}

export interface SignUpInput {
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  provider: AuthProviderId;
  googleSubject?: string;
  photoUrl?: string | null;
  patient?: PatientDraft;
  doctor?: DoctorDraft;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function findAccountByEmail(db: Database, email: string): Account | null {
  const key = normaliseEmail(email);
  return db.accounts.find((a) => normaliseEmail(a.email) === key) ?? null;
}

function sessionFor(db: Database, account: Account): Session {
  const patient = db.patients.find((p) => p.accountId === account.id) ?? null;
  const doctor = db.doctors.find((d) => d.accountId === account.id) ?? null;
  return {
    accountId: account.id,
    role: account.role,
    patientId: patient?.id ?? null,
    doctorId: doctor?.id ?? null,
    hospitalId: doctor?.hospitalId ?? patient?.hospitalId ?? db.hospitals[0]?.id ?? null,
    startedAt: new Date().toISOString(),
  };
}

/* ---------------------------- sign up ---------------------------- */

export async function signUp(db: Database, input: SignUpInput): Promise<AuthResult> {
  const email = normaliseEmail(input.email);
  if (!input.fullName.trim()) return { ok: false, error: 'name_required' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'invalid_email' };
  if (findAccountByEmail(db, email)) return { ok: false, error: 'email_taken' };
  if (input.provider === 'local' && (input.password ?? '').length < 8) {
    return { ok: false, error: 'weak_password' };
  }
  if (input.role === 'doctor') {
    if (!input.doctor?.hospitalId) return { ok: false, error: 'hospital_required' };
    if (!input.doctor?.registrationNumber.trim()) {
      return { ok: false, error: 'registration_required' };
    }
  }

  const now = new Date().toISOString();
  const account: Account = {
    id: createId('acc'),
    role: input.role,
    fullName: input.fullName.trim(),
    email,
    phone: input.phone.trim(),
    photoUrl: input.photoUrl ?? null,
    provider: input.provider,
    createdAt: now,
    lastLoginAt: now,
    googleSubject: input.googleSubject,
  };

  if (input.provider === 'local') {
    const salt = randomSalt();
    account.passwordSalt = salt;
    account.passwordHash = await hashPassword(input.password as string, salt);
  }

  const next: Database = {
    ...db,
    accounts: [...db.accounts, account],
    settings: { ...db.settings, [account.id]: { ...DEFAULT_SETTINGS } },
  };

  if (input.role === 'patient') {
    const draft = input.patient;
    const patient: PatientProfile = {
      id: createId('pat'),
      accountId: account.id,
      fullName: account.fullName,
      dateOfBirth: draft?.dateOfBirth ?? null,
      gender: draft?.gender ?? 'unspecified',
      bloodGroup: draft?.bloodGroup ?? 'unknown',
      heightCm: draft?.heightCm ?? null,
      weightKg: draft?.weightKg ?? null,
      phone: account.phone,
      address: draft?.address ?? '',
      city: draft?.city ?? '',
      allergies: draft?.allergies ?? [],
      conditions: draft?.conditions ?? [],
      emergencyContactName: draft?.emergencyContactName ?? '',
      emergencyContactPhone: draft?.emergencyContactPhone ?? '',
      primaryDoctorId: draft?.primaryDoctorId ?? null,
      hospitalId: draft?.hospitalId ?? db.hospitals[0]?.id ?? null,
      abhaId: draft?.abhaId ?? null,
      createdAt: now,
    };
    next.patients = [...next.patients, patient];
    next.goals = [...next.goals, { patientId: patient.id, ...DEFAULT_WELLNESS_GOAL }];
  }

  if (input.role === 'doctor' && input.doctor) {
    const doctor: DoctorProfile = {
      id: createId('doc'),
      accountId: account.id,
      fullName: account.fullName,
      specialization: input.doctor.specialization,
      registrationNumber: input.doctor.registrationNumber.trim(),
      hospitalId: input.doctor.hospitalId,
      qualifications: input.doctor.qualifications,
      experienceYears: input.doctor.experienceYears,
      languages: input.doctor.languages,
      consultationFee: input.doctor.consultationFee,
      roomNumber: input.doctor.roomNumber,
      // A new doctor starts with a standard Mon–Sat morning clinic.
      availability: [1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        start: '09:00',
        end: '13:00',
      })),
      slotMinutes: 20,
      createdAt: now,
    };
    next.doctors = [...next.doctors, doctor];
  }

  const session = sessionFor(next, account);
  return { ok: true, db: { ...next, session }, session, account };
}

/* ---------------------------- sign in ---------------------------- */

export async function signInWithPassword(
  db: Database,
  email: string,
  password: string,
): Promise<AuthResult> {
  const account = findAccountByEmail(db, email);
  if (!account || account.provider !== 'local' || !account.passwordHash || !account.passwordSalt) {
    return { ok: false, error: 'invalid_credentials' };
  }
  const hash = await hashPassword(password, account.passwordSalt);
  if (!safeEqual(hash, account.passwordHash)) {
    return { ok: false, error: 'invalid_credentials' };
  }
  return finishSignIn(db, account);
}

export interface GoogleSignInOutcome {
  status: 'signed_in' | 'needs_profile';
  result?: AuthResult;
}

/**
 * Google users who already have an account are signed straight in. New ones are
 * handed back to the UI so they can pick a role and complete their profile —
 * the app never invents a medical profile on the user's behalf.
 */
export async function signInWithGoogle(
  db: Database,
  profile: { subject: string; email: string; fullName: string; photoUrl: string | null },
): Promise<GoogleSignInOutcome> {
  const existing =
    db.accounts.find((a) => a.googleSubject && a.googleSubject === profile.subject) ??
    findAccountByEmail(db, profile.email);

  if (!existing) return { status: 'needs_profile' };

  const linked: Account = {
    ...existing,
    googleSubject: existing.googleSubject ?? profile.subject,
    photoUrl: existing.photoUrl ?? profile.photoUrl,
  };
  const withLink: Database = {
    ...db,
    accounts: db.accounts.map((a) => (a.id === linked.id ? linked : a)),
  };
  return { status: 'signed_in', result: await finishSignIn(withLink, linked) };
}

async function finishSignIn(db: Database, account: Account): Promise<AuthResult> {
  const stamped: Account = { ...account, lastLoginAt: new Date().toISOString() };
  const next: Database = {
    ...db,
    accounts: db.accounts.map((a) => (a.id === stamped.id ? stamped : a)),
    settings: db.settings[stamped.id]
      ? db.settings
      : { ...db.settings, [stamped.id]: { ...DEFAULT_SETTINGS } },
  };
  const session = sessionFor(next, stamped);
  return { ok: true, db: { ...next, session }, session, account: stamped };
}

export function signOut(db: Database): Database {
  return { ...db, session: null };
}
