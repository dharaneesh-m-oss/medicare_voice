/**
 * Identity and profile models.
 *
 * Three roles share one account table; each role owns a profile record.
 * Accounts can be created locally (email + password) or through Google.
 */

export type Role = 'patient' | 'doctor' | 'hospital_admin';
export type AuthProviderId = 'local' | 'google';

export interface Account {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  photoUrl: string | null;
  provider: AuthProviderId;
  createdAt: string;
  lastLoginAt: string | null;
  /** Local provider only — PBKDF2-SHA256, never the raw password. */
  passwordHash?: string;
  passwordSalt?: string;
  /** Google subject id, so the same Google user maps back to one account. */
  googleSubject?: string;
}

export type Gender = 'female' | 'male' | 'other' | 'unspecified';

export type BloodGroup =
  | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';

export const BLOOD_GROUPS: BloodGroup[] = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown',
];

export interface PatientProfile {
  id: string;
  accountId: string;
  fullName: string;
  /** "YYYY-MM-DD" */
  dateOfBirth: string | null;
  gender: Gender;
  bloodGroup: BloodGroup;
  heightCm: number | null;
  weightKg: number | null;
  phone: string;
  address: string;
  city: string;
  allergies: string[];
  conditions: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  primaryDoctorId: string | null;
  hospitalId: string | null;
  /** Ayushman Bharat Health Account number, if the patient has one. */
  abhaId: string | null;
  createdAt: string;
}

export interface AvailabilityWindow {
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  /** "HH:MM" */
  start: string;
  end: string;
}

export interface DoctorProfile {
  id: string;
  accountId: string;
  fullName: string;
  specialization: string;
  /** State medical council registration number. */
  registrationNumber: string;
  hospitalId: string;
  qualifications: string;
  experienceYears: number;
  languages: string[];
  consultationFee: number;
  roomNumber: string;
  availability: AvailabilityWindow[];
  /** Length of one consultation slot, minutes. */
  slotMinutes: number;
  createdAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  departments: string[];
}

export interface Session {
  accountId: string;
  role: Role;
  patientId: string | null;
  doctorId: string | null;
  hospitalId: string | null;
  startedAt: string;
}

export const SPECIALIZATIONS = [
  'General Medicine',
  'Cardiology',
  'Diabetology',
  'Orthopaedics',
  'Geriatrics',
  'Psychiatry',
  'Pulmonology',
  'Ophthalmology',
] as const;

/** Age in whole years, or null when the date of birth is unknown. */
export function ageFrom(dateOfBirth: string | null, now: Date = new Date()): number | null {
  if (!dateOfBirth) return null;
  const [y, m, d] = dateOfBirth.split('-').map(Number);
  if (!y) return null;
  let age = now.getFullYear() - y;
  const hadBirthday =
    now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** BMI to one decimal, or null when height/weight are missing. */
export function bmiFrom(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm < 50) return null;
  const m = heightCm / 100;
  return Number((weightKg / (m * m)).toFixed(1));
}
