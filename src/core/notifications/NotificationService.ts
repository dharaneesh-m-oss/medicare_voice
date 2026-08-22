/**
 * Builds the notification feed for whoever is signed in.
 *
 * Pure functions over the database — no timers, no push service. On Android the
 * derived alerts become the payload an AlarmManager/WorkManager job schedules,
 * and the stored messages become an FCM topic; the selection logic below does
 * not change.
 */

import type { PatientProfile } from '../auth/types';
import { appointmentTimestamp } from '../clinic/AppointmentService';
import type { Appointment, ClinicalNote } from '../clinic/types';
import type { Database } from '../storage/Database';
import { daysBetween, fromISODate, toISODate } from '../utils/date';
import type { FeedItem, NotificationSeverity, StoredNotification } from './types';

/** Appointment statuses that still hold a slot. */
const OPEN = ['requested', 'confirmed', 'checked_in'];

export interface OutstandingFollowUp {
  note: ClinicalNote;
  patient: PatientProfile;
  doctorName: string;
  /** negative = already overdue */
  daysUntil: number;
  severity: NotificationSeverity;
}

/**
 * Follow-ups a doctor asked for that nobody has booked yet.
 *
 * This is the alert the front desk actually needs: a note says "review in three
 * weeks", the date is approaching, and there is no appointment on the book.
 */
export function outstandingFollowUps(
  db: Database,
  now: Date = new Date(),
  horizonDays = 21,
): OutstandingFollowUp[] {
  const today = toISODate(now);
  const out: OutstandingFollowUp[] = [];

  for (const note of db.notes) {
    if (!note.followUpDate) continue;

    const daysUntil = daysBetween(now, fromISODate(note.followUpDate));
    if (daysUntil > horizonDays) continue;
    // Stop nagging about follow-ups from long ago.
    if (daysUntil < -60) continue;

    const alreadyBooked = db.appointments.some(
      (a) => a.patientId === note.patientId && OPEN.includes(a.status) && a.date >= today,
    );
    if (alreadyBooked) continue;

    const patient = db.patients.find((p) => p.id === note.patientId);
    if (!patient) continue;

    out.push({
      note,
      patient,
      doctorName: db.doctors.find((d) => d.id === note.doctorId)?.fullName ?? '',
      daysUntil,
      severity: daysUntil < 0 ? 'urgent' : daysUntil <= 3 ? 'attention' : 'info',
    });
  }

  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}

function storedToFeed(notification: StoredNotification): FeedItem {
  return {
    id: notification.id,
    kind: notification.kind,
    severity: 'info',
    title: notification.title,
    body: notification.body,
    createdAt: notification.createdAt,
    read: notification.readAt !== null,
    source: 'stored',
    actionScreen: notification.actionScreen ?? undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Hospital desk                                                       */
/* ------------------------------------------------------------------ */

export function deskFeed(db: Database, now: Date = new Date()): FeedItem[] {
  const items: FeedItem[] = [];
  const today = toISODate(now);

  for (const followUp of outstandingFollowUps(db, now)) {
    items.push({
      id: `fu-${followUp.note.id}`,
      kind: 'follow_up_due',
      severity: followUp.severity,
      titleKey:
        followUp.daysUntil < 0 ? 'notify.follow_up_overdue' : 'notify.follow_up_due',
      bodyKey: 'notify.follow_up_body',
      params: {
        name: followUp.patient.fullName,
        doctor: followUp.doctorName,
        days: Math.abs(followUp.daysUntil),
        date: followUp.note.followUpDate ?? '',
      },
      createdAt: followUp.note.createdAt,
      read: false,
      source: 'derived',
      patientId: followUp.patient.id,
      actionScreen: 'hospital_appointments',
    });
  }

  for (const appointment of db.appointments.filter((a) => a.status === 'requested')) {
    items.push({
      id: `req-${appointment.id}`,
      kind: 'appointment_request',
      severity: 'attention',
      titleKey: 'notify.request_title',
      bodyKey: 'notify.request_body',
      params: {
        name: db.patients.find((p) => p.id === appointment.patientId)?.fullName ?? '',
        doctor: db.doctors.find((d) => d.id === appointment.doctorId)?.fullName ?? '',
        date: appointment.date,
        time: appointment.time,
      },
      createdAt: appointment.createdAt,
      read: false,
      source: 'derived',
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      actionScreen: 'hospital_appointments',
    });
  }

  const tomorrow = db.appointments.filter(
    (a) => OPEN.includes(a.status) && daysBetween(now, fromISODate(a.date)) === 1,
  );
  if (tomorrow.length > 0) {
    items.push({
      id: `tomorrow-${today}`,
      kind: 'appointment_soon',
      severity: 'info',
      titleKey: 'notify.tomorrow_title',
      bodyKey: 'notify.tomorrow_body',
      params: { count: tomorrow.length },
      createdAt: now.toISOString(),
      read: false,
      source: 'derived',
      actionScreen: 'hospital_appointments',
    });
  }

  const stored = db.notifications
    .filter((n) => n.toRole === 'hospital_admin')
    .map(storedToFeed);

  return [...items, ...stored].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ------------------------------------------------------------------ */
/* Patient                                                             */
/* ------------------------------------------------------------------ */

export function patientFeed(
  db: Database,
  patientId: string | null,
  now: Date = new Date(),
): FeedItem[] {
  if (!patientId) return [];
  const items: FeedItem[] = [];

  const upcoming = db.appointments
    .filter((a) => a.patientId === patientId && OPEN.includes(a.status))
    .filter((a) => appointmentTimestamp(a) >= now.getTime())
    .sort((a, b) => appointmentTimestamp(a) - appointmentTimestamp(b));

  const next: Appointment | undefined = upcoming[0];
  if (next) {
    const days = daysBetween(now, fromISODate(next.date));
    if (days <= 2) {
      items.push({
        id: `apt-${next.id}`,
        kind: next.status === 'confirmed' ? 'appointment_confirmed' : 'appointment_soon',
        severity: 'info',
        titleKey: days <= 0 ? 'notify.visit_today' : 'notify.visit_soon',
        bodyKey: 'notify.visit_body',
        params: {
          doctor: db.doctors.find((d) => d.id === next.doctorId)?.fullName ?? '',
          days,
          time: next.time,
        },
        createdAt: next.createdAt,
        read: false,
        source: 'derived',
        appointmentId: next.id,
        actionScreen: 'appointments',
      });
    }
  }

  const stored = db.notifications
    .filter((n) => n.toPatientId === patientId)
    .map(storedToFeed);

  return [...items, ...stored].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadCount(feed: FeedItem[]): number {
  return feed.filter((item) => !item.read).length;
}
