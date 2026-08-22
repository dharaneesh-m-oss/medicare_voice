/**
 * APPOINTMENT ENGINE — pure functions over doctors and appointments.
 *
 * Slot generation, double-booking prevention, day queues and follow-up lookup.
 * No React, no storage: the same rules run on the patient's booking screen, the
 * doctor's day view and the hospital's board.
 */

import type { AvailabilityWindow, DoctorProfile } from '../auth/types';
import { createId } from '../types';
import { addDays, minutesToTime, timeToMinutes, timestampFor, toISODate } from '../utils/date';
import type { Appointment, AppointmentMode, AppointmentStatus } from './types';

/** Statuses that still occupy a slot. */
const BLOCKING: AppointmentStatus[] = ['requested', 'confirmed', 'checked_in', 'completed'];

export interface Slot {
  /** "HH:MM" */
  time: string;
  available: boolean;
  reason: 'free' | 'booked' | 'past';
}

function windowsFor(doctor: DoctorProfile, isoDate: string): AvailabilityWindow[] {
  const weekday = new Date(`${isoDate}T00:00:00`).getDay();
  return doctor.availability.filter((w) => w.weekday === weekday);
}

export function isWorkingDay(doctor: DoctorProfile, isoDate: string): boolean {
  return windowsFor(doctor, isoDate).length > 0;
}

export function generateSlots(
  doctor: DoctorProfile,
  isoDate: string,
  appointments: Appointment[],
  now: Date = new Date(),
): Slot[] {
  const taken = new Set(
    appointments
      .filter(
        (a) =>
          a.doctorId === doctor.id && a.date === isoDate && BLOCKING.includes(a.status),
      )
      .map((a) => a.time),
  );

  const slots: Slot[] = [];
  for (const window of windowsFor(doctor, isoDate)) {
    const start = timeToMinutes(window.start);
    const end = timeToMinutes(window.end);
    if (start === null || end === null) continue;
    for (let m = start; m + doctor.slotMinutes <= end; m += doctor.slotMinutes) {
      const time = minutesToTime(m);
      if (taken.has(time)) {
        slots.push({ time, available: false, reason: 'booked' });
      } else if (timestampFor(isoDate, time) < now.getTime()) {
        slots.push({ time, available: false, reason: 'past' });
      } else {
        slots.push({ time, available: true, reason: 'free' });
      }
    }
  }
  return slots;
}

/** The next `count` days on which this doctor works. */
export function nextWorkingDays(
  doctor: DoctorProfile,
  count = 7,
  now: Date = new Date(),
): string[] {
  const out: string[] = [];
  for (let offset = 0; offset < 45 && out.length < count; offset += 1) {
    const iso = toISODate(addDays(now, offset));
    if (isWorkingDay(doctor, iso)) out.push(iso);
  }
  return out;
}

export interface BookingRequest {
  patientId: string;
  doctor: DoctorProfile;
  date: string;
  time: string;
  mode: AppointmentMode;
  reason: string;
  createdByAccountId: string;
  /** Doctor/reception bookings are confirmed straight away. */
  autoConfirm?: boolean;
  followUpForAppointmentId?: string | null;
}

export type BookingError =
  | 'slot_taken'
  | 'slot_past'
  | 'not_working'
  | 'reason_required'
  | null;

export function validateBooking(
  request: BookingRequest,
  appointments: Appointment[],
  now: Date = new Date(),
): BookingError {
  if (!request.reason.trim()) return 'reason_required';
  if (!isWorkingDay(request.doctor, request.date)) return 'not_working';
  if (timestampFor(request.date, request.time) < now.getTime()) return 'slot_past';
  const clash = appointments.some(
    (a) =>
      a.doctorId === request.doctor.id &&
      a.date === request.date &&
      a.time === request.time &&
      BLOCKING.includes(a.status),
  );
  return clash ? 'slot_taken' : null;
}

export function buildAppointment(request: BookingRequest): Appointment {
  return {
    id: createId('apt'),
    patientId: request.patientId,
    doctorId: request.doctor.id,
    hospitalId: request.doctor.hospitalId,
    date: request.date,
    time: request.time,
    durationMinutes: request.doctor.slotMinutes,
    mode: request.mode,
    status: request.autoConfirm ? 'confirmed' : 'requested',
    reason: request.reason.trim(),
    notes: '',
    createdAt: new Date().toISOString(),
    createdByAccountId: request.createdByAccountId,
    checkedInAt: null,
    completedAt: null,
    followUpForAppointmentId: request.followUpForAppointmentId ?? null,
  };
}

/* --------------------------- queries --------------------------- */

export function appointmentTimestamp(appointment: Appointment): number {
  return timestampFor(appointment.date, appointment.time);
}

const OPEN: AppointmentStatus[] = ['requested', 'confirmed', 'checked_in'];

export function upcomingForPatient(
  appointments: Appointment[],
  patientId: string | null,
  now: Date = new Date(),
): Appointment[] {
  if (!patientId) return [];
  return appointments
    .filter(
      (a) =>
        a.patientId === patientId &&
        OPEN.includes(a.status) &&
        appointmentTimestamp(a) >= now.getTime() - 60 * 60_000,
    )
    .sort((a, b) => appointmentTimestamp(a) - appointmentTimestamp(b));
}

/** The "next doctor checkup" shown on the patient's home screen. */
export function nextCheckup(
  appointments: Appointment[],
  patientId: string | null,
  now: Date = new Date(),
): Appointment | null {
  return upcomingForPatient(appointments, patientId, now)[0] ?? null;
}

export function pastForPatient(
  appointments: Appointment[],
  patientId: string | null,
  now: Date = new Date(),
): Appointment[] {
  if (!patientId) return [];
  return appointments
    .filter(
      (a) =>
        a.patientId === patientId &&
        (a.status === 'completed' ||
          a.status === 'cancelled' ||
          a.status === 'no_show' ||
          appointmentTimestamp(a) < now.getTime() - 60 * 60_000),
    )
    .sort((a, b) => appointmentTimestamp(b) - appointmentTimestamp(a));
}

/** One doctor's list for one day, in clock order. */
export function dayQueue(
  appointments: Appointment[],
  doctorId: string,
  isoDate: string,
): Appointment[] {
  return appointments
    .filter((a) => a.doctorId === doctorId && a.date === isoDate && a.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** Everything a hospital has on one day, across all doctors. */
export function hospitalDay(
  appointments: Appointment[],
  hospitalId: string,
  isoDate: string,
): Appointment[] {
  return appointments
    .filter((a) => a.hospitalId === hospitalId && a.date === isoDate)
    .sort((a, b) => a.time.localeCompare(b.time));
}

export interface HospitalStats {
  today: number;
  waiting: number;
  completed: number;
  cancelled: number;
  requests: number;
  upcoming7Days: number;
}

export function hospitalStats(
  appointments: Appointment[],
  hospitalId: string,
  now: Date = new Date(),
): HospitalStats {
  const today = toISODate(now);
  const todays = hospitalDay(appointments, hospitalId, today);
  const horizon = toISODate(addDays(now, 7));
  return {
    today: todays.filter((a) => a.status !== 'cancelled').length,
    waiting: todays.filter((a) => a.status === 'checked_in').length,
    completed: todays.filter((a) => a.status === 'completed').length,
    cancelled: todays.filter((a) => a.status === 'cancelled').length,
    requests: appointments.filter((a) => a.hospitalId === hospitalId && a.status === 'requested')
      .length,
    upcoming7Days: appointments.filter(
      (a) =>
        a.hospitalId === hospitalId &&
        OPEN.includes(a.status) &&
        a.date >= today &&
        a.date <= horizon,
    ).length,
  };
}
