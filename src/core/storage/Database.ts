/**
 * The whole application database, local-first.
 *
 * One JSON document in `localStorage` under `medicare.v2.db`. This is the single
 * module that knows about persistence: on a server-backed build it becomes a
 * repository layer over an API, and on Android a Room database, without any
 * other layer changing.
 */

import type {
  Account,
  DoctorProfile,
  Hospital,
  PatientProfile,
  Session,
} from '../auth/types';
import type {
  Appointment,
  ClinicalNote,
  Prescription,
  VitalReading,
  VitalTarget,
} from '../clinic/types';
import type {
  DoseRecord,
  Medicine,
  ScanResult,
  ScheduleEntry,
  Settings,
} from '../types';
import type { StoredNotification } from '../notifications/types';
import type { ActivityLog, MoodEntry, WellnessGoal } from '../wellness/types';

const STORAGE_KEY = 'medicare.v2.db';
export const DB_VERSION = 2;

/** Keep storage small: full scan images only for the most recent scans. */
const MAX_SCANS = 40;
const SCANS_WITH_IMAGE = 4;

export interface Database {
  version: number;
  seededAt: string | null;

  accounts: Account[];
  patients: PatientProfile[];
  doctors: DoctorProfile[];
  hospitals: Hospital[];

  appointments: Appointment[];
  notes: ClinicalNote[];
  prescriptions: Prescription[];
  vitals: VitalReading[];
  vitalTargets: VitalTarget[];

  medicines: Medicine[];
  schedules: ScheduleEntry[];
  doseRecords: DoseRecord[];
  scans: ScanResult[];

  activity: ActivityLog[];
  moods: MoodEntry[];
  goals: WellnessGoal[];

  /** Messages a person sent. Derived alerts are recomputed, not stored. */
  notifications: StoredNotification[];

  /** Per-account UI settings, keyed by account id. */
  settings: Record<string, Settings>;
  session: Session | null;
}

export function emptyDatabase(): Database {
  return {
    version: DB_VERSION,
    seededAt: null,
    accounts: [],
    patients: [],
    doctors: [],
    hospitals: [],
    appointments: [],
    notes: [],
    prescriptions: [],
    vitals: [],
    vitalTargets: [],
    medicines: [],
    schedules: [],
    doseRecords: [],
    scans: [],
    activity: [],
    moods: [],
    goals: [],
    notifications: [],
    settings: {},
    session: null,
  };
}

function backend(): Storage | null {
  try {
    const probe = `${STORAGE_KEY}.probe`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    console.warn('[Database] localStorage unavailable — running in memory only.');
    return null;
  }
}

let memory: string | null = null;

export function readDatabase(): Database | null {
  const store = backend();
  const raw = store ? store.getItem(STORAGE_KEY) : memory;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Database;
    if (parsed.version !== DB_VERSION) {
      console.warn('[Database] schema version changed — reseeding.');
      return null;
    }
    return { ...emptyDatabase(), ...parsed };
  } catch {
    console.warn('[Database] corrupt document — reseeding.');
    return null;
  }
}

/** Drop old scan images before writing so the document stays small. */
function compact(db: Database): Database {
  const scans = db.scans
    .slice(0, MAX_SCANS)
    .map((scan, index) => (index < SCANS_WITH_IMAGE ? scan : { ...scan, imageDataUrl: null }));
  return { ...db, scans };
}

export function writeDatabase(db: Database): void {
  const payload = JSON.stringify(compact(db));
  const store = backend();
  if (!store) {
    memory = payload;
    return;
  }
  try {
    store.setItem(STORAGE_KEY, payload);
  } catch (err) {
    console.error('[Database] write failed (quota?)', err);
  }
}

export function clearDatabase(): void {
  const store = backend();
  if (store) store.removeItem(STORAGE_KEY);
  memory = null;
}

/* ------------------------------------------------------------------ */
/* Selectors — the only way the UI slices the database                  */
/* ------------------------------------------------------------------ */

export const selectPatient = (db: Database, id: string | null) =>
  db.patients.find((p) => p.id === id) ?? null;

export const selectDoctor = (db: Database, id: string | null) =>
  db.doctors.find((d) => d.id === id) ?? null;

export const selectHospital = (db: Database, id: string | null) =>
  db.hospitals.find((h) => h.id === id) ?? null;

export const selectAccount = (db: Database, id: string | null) =>
  db.accounts.find((a) => a.id === id) ?? null;

export const selectPatientByAccount = (db: Database, accountId: string) =>
  db.patients.find((p) => p.accountId === accountId) ?? null;

export const selectDoctorByAccount = (db: Database, accountId: string) =>
  db.doctors.find((d) => d.accountId === accountId) ?? null;

export const forPatient = <T extends { patientId: string }>(rows: T[], patientId: string | null) =>
  patientId ? rows.filter((row) => row.patientId === patientId) : [];

/** Patients a doctor has ever seen or is scheduled to see. */
export function selectDoctorPatients(db: Database, doctorId: string): PatientProfile[] {
  const ids = new Set<string>();
  db.appointments.filter((a) => a.doctorId === doctorId).forEach((a) => ids.add(a.patientId));
  db.patients.filter((p) => p.primaryDoctorId === doctorId).forEach((p) => ids.add(p.id));
  return db.patients.filter((p) => ids.has(p.id));
}
