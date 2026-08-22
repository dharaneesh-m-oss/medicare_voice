/**
 * Notifications.
 *
 * Two sources feed one inbox:
 *  - DERIVED alerts, recomputed from the data every render (a follow-up is due,
 *    a booking is waiting for confirmation, a visit is tomorrow). Nothing to keep
 *    in sync, nothing to expire — if the underlying fact changes, the alert
 *    changes with it.
 *  - STORED messages, which someone actually sent (the hospital desk reminding a
 *    patient about a follow-up). Those persist and can be marked read.
 */

import type { Role } from '../auth/types';

export type NotificationKind =
  | 'follow_up_due'
  | 'appointment_request'
  | 'appointment_soon'
  | 'appointment_confirmed'
  | 'desk_message'
  | 'medication_missed'
  | 'wellbeing';

export type NotificationSeverity = 'info' | 'attention' | 'urgent';

/** A message a person sent. Persisted. */
export interface StoredNotification {
  id: string;
  /** Recipient: a specific patient, or every account holding this role. */
  toPatientId: string | null;
  toRole: Role | null;
  fromAccountId: string;
  fromName: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  actionScreen: string | null;
}

/**
 * What the inbox renders. Derived alerts carry translation keys; stored messages
 * carry the literal text their sender typed.
 */
export interface FeedItem {
  id: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  titleKey?: string;
  title?: string;
  bodyKey?: string;
  body?: string;
  params?: Record<string, string | number>;
  createdAt: string;
  read: boolean;
  source: 'derived' | 'stored';
  actionScreen?: string;
  /** Set on desk alerts so the desk can act on the patient directly. */
  patientId?: string;
  appointmentId?: string;
}
