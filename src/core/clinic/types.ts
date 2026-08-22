/**
 * Clinic domain: appointments, consultation notes, prescriptions and vitals.
 * These are the records a hospital keeps digitally about a patient.
 */

import type { DosageForm, Frequency, Strength } from '../types';

export type AppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type AppointmentMode = 'in_person' | 'video' | 'home_visit';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  time: string;
  durationMinutes: number;
  mode: AppointmentMode;
  status: AppointmentStatus;
  reason: string;
  /** Free text added by reception or the doctor. */
  notes: string;
  createdAt: string;
  createdByAccountId: string;
  checkedInAt: string | null;
  completedAt: string | null;
  /** Set when this visit was booked as a follow-up of an earlier one. */
  followUpForAppointmentId: string | null;
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId: string | null;
  /** "YYYY-MM-DD" */
  date: string;
  complaint: string;
  observations: string;
  advice: string;
  /** "YYYY-MM-DD" or null */
  followUpDate: string | null;
  createdAt: string;
}

export interface PrescriptionItem {
  medicineName: string;
  strength: Strength | null;
  form: DosageForm;
  frequency: Frequency;
  /** "HH:MM" values matching the frequency */
  times: string[];
  durationDays: number;
  instructions: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId: string | null;
  issuedAt: string;
  items: PrescriptionItem[];
  notes: string;
  /** True once the patient has pulled it into their own medication schedule. */
  addedToSchedule: boolean;
}

export type VitalType =
  | 'blood_pressure'
  | 'blood_sugar'
  | 'weight'
  | 'heart_rate'
  | 'spo2'
  | 'temperature';

export const VITAL_UNITS: Record<VitalType, string> = {
  blood_pressure: 'mmHg',
  blood_sugar: 'mg/dL',
  weight: 'kg',
  heart_rate: 'bpm',
  spo2: '%',
  temperature: '°C',
};

export interface VitalReading {
  id: string;
  patientId: string;
  type: VitalType;
  /** Systolic for blood pressure. */
  value: number;
  /** Diastolic for blood pressure, otherwise null. */
  secondaryValue: number | null;
  measuredAt: string;
  source: 'self' | 'clinic';
  note: string;
}

/**
 * The acceptable range a DOCTOR recorded for this patient. The app compares
 * readings against this — it never invents clinical thresholds of its own.
 */
export interface VitalTarget {
  id: string;
  patientId: string;
  type: VitalType;
  min: number;
  max: number;
  /** Second number for blood pressure (diastolic bounds). */
  secondaryMin: number | null;
  secondaryMax: number | null;
  setByDoctorId: string;
  setAt: string;
}

export const APPOINTMENT_REASONS = [
  'Routine follow-up',
  'New symptom',
  'Medicine review',
  'Report review',
  'Second opinion',
] as const;
