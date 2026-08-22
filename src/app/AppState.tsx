/**
 * APPLICATION STATE.
 *
 * Holds the whole local database, exposes role-aware selectors and every write
 * the UI is allowed to make. Screens never touch storage or the core engines'
 * internals — they call the actions here.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type {
  GoogleSignInOutcome,
  SignUpInput,
} from '../core/auth/AuthService';
import {
  signInWithGoogle as authGoogle,
  signInWithPassword as authPassword,
  signOut as authSignOut,
  signUp as authSignUp,
  type AuthResult,
} from '../core/auth/AuthService';
import type {
  Account,
  DoctorProfile,
  Hospital,
  PatientProfile,
  Session,
} from '../core/auth/types';
import { buildAppointment, validateBooking, type BookingRequest } from '../core/clinic/AppointmentService';
import type {
  Appointment,
  AppointmentStatus,
  ClinicalNote,
  Prescription,
  VitalReading,
  VitalTarget,
  VitalType,
} from '../core/clinic/types';
import { createTranslator, getLanguage, type Translator } from '../core/i18n';
import { getInsightsEngine, type Insight } from '../core/insights/InsightsEngine';
import {
  deskFeed,
  patientFeed,
  unreadCount,
} from '../core/notifications/NotificationService';
import type {
  FeedItem,
  NotificationKind,
  StoredNotification,
} from '../core/notifications/types';
import {
  emptyDatabase,
  forPatient,
  readDatabase,
  selectDoctor,
  selectHospital,
  selectPatient,
  writeDatabase,
  type Database,
} from '../core/storage/Database';
import { buildDemoDatabase } from '../core/storage/seedDemo';
import type {
  DoseAction,
  DoseOccurrence,
  DoseRecord,
  Medicine,
  ScanResult,
  ScheduleEntry,
  Settings,
} from '../core/types';
import { DEFAULT_SETTINGS, createId, formatStrength } from '../core/types';
import { toISODate } from '../core/utils/date';
import type { ActivityLog, FivePoint, MoodEntry, WellnessGoal } from '../core/wellness/types';
import { DEFAULT_WELLNESS_GOAL } from '../core/wellness/types';
import {
  computeWellbeingScore,
  type WellbeingScore,
} from '../core/wellness/WellbeingScore';

const GUEST_SETTINGS_KEY = 'guest';

/** Everything the app knows about one patient — used by patient AND doctor screens. */
export interface PatientBundle {
  patient: PatientProfile | null;
  medicines: Medicine[];
  schedules: ScheduleEntry[];
  records: DoseRecord[];
  scans: ScanResult[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  notes: ClinicalNote[];
  vitals: VitalReading[];
  vitalTargets: VitalTarget[];
  activity: ActivityLog[];
  moods: MoodEntry[];
  goal: WellnessGoal;
}

export interface AppContextValue {
  ready: boolean;
  db: Database;

  session: Session | null;
  account: Account | null;
  patient: PatientProfile | null;
  doctor: DoctorProfile | null;
  hospital: Hospital | null;

  t: Translator;
  locale: string;
  settings: Settings;

  /* the signed-in patient's own data (empty for doctor/admin accounts) */
  medicines: Medicine[];
  schedules: ScheduleEntry[];
  records: DoseRecord[];
  scans: ScanResult[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  notes: ClinicalNote[];
  vitals: VitalReading[];
  vitalTargets: VitalTarget[];
  activity: ActivityLog[];
  moods: MoodEntry[];
  goal: WellnessGoal;
  lastScan: ScanResult | null;
  insights: Insight[];
  /** Digital wellbeing score for the signed-in patient. */
  wellbeing: WellbeingScore;
  /** Derived alerts + stored messages for whoever is signed in. */
  notifications: FeedItem[];
  unreadNotifications: number;

  /** Read any patient's bundle (doctor and hospital screens). */
  bundleFor: (patientId: string | null) => PatientBundle;

  /* auth */
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: (profile: {
    subject: string;
    email: string;
    fullName: string;
    photoUrl: string | null;
  }) => Promise<GoogleSignInOutcome>;
  signOut: () => void;

  /* settings + profile */
  patchSettings: (patch: Partial<Settings>) => void;
  updatePatientProfile: (patch: Partial<PatientProfile>) => void;
  updateDoctorProfile: (patch: Partial<DoctorProfile>) => void;

  /* medication */
  addMedicine: (medicine: Omit<Medicine, 'patientId'>, patientId?: string) => void;
  removeMedicine: (id: string) => void;
  addSchedule: (entry: Omit<ScheduleEntry, 'patientId'>, patientId?: string) => void;
  updateSchedule: (entry: ScheduleEntry) => void;
  removeSchedule: (id: string) => void;
  recordDose: (occurrence: DoseOccurrence, status: DoseAction, snoozeMinutes?: number) => void;
  clearDose: (occurrenceId: string) => void;
  addScan: (scan: Omit<ScanResult, 'patientId'>) => void;

  /* clinic */
  bookAppointment: (request: BookingRequest) => { ok: true; appointment: Appointment } | { ok: false; error: string };
  setAppointmentStatus: (id: string, status: AppointmentStatus, notes?: string) => void;
  addClinicalNote: (note: Omit<ClinicalNote, 'id' | 'createdAt'>) => void;
  addPrescription: (prescription: Omit<Prescription, 'id' | 'issuedAt' | 'addedToSchedule'>) => void;
  adoptPrescription: (prescriptionId: string) => void;
  addVital: (reading: Omit<VitalReading, 'id'>) => void;
  setVitalTarget: (target: Omit<VitalTarget, 'id' | 'setAt'>) => void;

  /* notifications */
  sendNotification: (input: {
    toPatientId?: string | null;
    toRole?: 'patient' | 'doctor' | 'hospital_admin' | null;
    kind: NotificationKind;
    title: string;
    body: string;
    actionScreen?: string | null;
  }) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  /* wellness */
  logActivity: (patch: Partial<Omit<ActivityLog, 'id' | 'patientId' | 'date'>>) => void;
  logMood: (entry: { mood: FivePoint; stress: FivePoint; sleepQuality: FivePoint; note: string }) => void;
  updateGoal: (patch: Partial<WellnessGoal>) => void;

  resetDemoData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => emptyDatabase());
  const [ready, setReady] = useState(false);

  /* ---- bootstrap: load or seed ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = readDatabase();
      if (stored) {
        if (!cancelled) {
          setDb(stored);
          setReady(true);
        }
        return;
      }
      const seeded = await buildDemoDatabase();
      if (cancelled) return;
      writeDatabase(seeded);
      setDb(seeded);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- persistence ---- */
  useEffect(() => {
    if (ready) writeDatabase(db);
  }, [db, ready]);

  const mutate = useCallback((fn: (current: Database) => Database) => {
    setDb((current) => fn(current));
  }, []);

  /* ---- identity ---- */
  const session = db.session;
  const account = useMemo(
    () => db.accounts.find((a) => a.id === session?.accountId) ?? null,
    [db.accounts, session?.accountId],
  );
  const patient = useMemo(
    () => selectPatient(db, session?.patientId ?? null),
    [db, session?.patientId],
  );
  const doctor = useMemo(
    () => selectDoctor(db, session?.doctorId ?? null),
    [db, session?.doctorId],
  );
  const hospital = useMemo(
    () => selectHospital(db, session?.hospitalId ?? db.hospitals[0]?.id ?? null),
    [db, session?.hospitalId],
  );

  const settingsKey = account?.id ?? GUEST_SETTINGS_KEY;
  const settings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...(db.settings[settingsKey] ?? {}) }),
    [db.settings, settingsKey],
  );

  const t = useMemo(() => createTranslator(settings.language), [settings.language]);
  const locale = useMemo(() => getLanguage(settings.language).locale, [settings.language]);

  /* ---- patient bundles ---- */
  const bundleFor = useCallback(
    (patientId: string | null): PatientBundle => ({
      patient: selectPatient(db, patientId),
      medicines: forPatient(db.medicines, patientId),
      schedules: forPatient(db.schedules, patientId),
      records: forPatient(db.doseRecords, patientId),
      scans: forPatient(db.scans, patientId),
      appointments: patientId ? db.appointments.filter((a) => a.patientId === patientId) : [],
      prescriptions: forPatient(db.prescriptions, patientId),
      notes: forPatient(db.notes, patientId),
      vitals: forPatient(db.vitals, patientId),
      vitalTargets: forPatient(db.vitalTargets, patientId),
      activity: forPatient(db.activity, patientId),
      moods: forPatient(db.moods, patientId),
      goal:
        db.goals.find((g) => g.patientId === patientId) ??
        ({ patientId: patientId ?? '', ...DEFAULT_WELLNESS_GOAL } as WellnessGoal),
    }),
    [db],
  );

  const own = useMemo(() => bundleFor(session?.patientId ?? null), [bundleFor, session?.patientId]);

  const wellbeing = useMemo(
    () =>
      computeWellbeingScore({
        activity: own.activity,
        moods: own.moods,
        schedules: own.schedules,
        records: own.records,
        goal: own.goal,
      }),
    [own],
  );

  const notifications = useMemo(() => {
    if (!session) return [];
    if (session.role === 'hospital_admin') return deskFeed(db);
    if (session.role === 'patient') return patientFeed(db, session.patientId);
    // A doctor sees the follow-ups and requests that concern their own clinic.
    return deskFeed(db).filter(
      (item) =>
        !item.patientId ||
        db.appointments.some(
          (a) => a.patientId === item.patientId && a.doctorId === session.doctorId,
        ),
    );
  }, [db, session]);

  const insights = useMemo(() => {
    if (!own.patient) return [];
    return getInsightsEngine().analyse({
      patient: own.patient,
      schedules: own.schedules,
      doseRecords: own.records,
      medicines: own.medicines,
      appointments: own.appointments,
      vitals: own.vitals,
      vitalTargets: own.vitalTargets,
      activity: own.activity,
      moods: own.moods,
      goal: own.goal,
    });
  }, [own]);

  /* ---- auth actions ---- */
  const signUp = useCallback(
    async (input: SignUpInput) => {
      const result = await authSignUp(db, input);
      if (result.ok) setDb(result.db);
      return result;
    },
    [db],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await authPassword(db, email, password);
      if (result.ok) setDb(result.db);
      return result;
    },
    [db],
  );

  const signInWithGoogle = useCallback(
    async (profile: { subject: string; email: string; fullName: string; photoUrl: string | null }) => {
      const outcome = await authGoogle(db, profile);
      if (outcome.status === 'signed_in' && outcome.result?.ok) setDb(outcome.result.db);
      return outcome;
    },
    [db],
  );

  const signOut = useCallback(() => mutate((current) => authSignOut(current)), [mutate]);

  /* ---- settings + profile ---- */
  const patchSettings = useCallback(
    (patch: Partial<Settings>) =>
      mutate((current) => ({
        ...current,
        settings: {
          ...current.settings,
          [settingsKey]: { ...DEFAULT_SETTINGS, ...(current.settings[settingsKey] ?? {}), ...patch },
        },
      })),
    [mutate, settingsKey],
  );

  const updatePatientProfile = useCallback(
    (patch: Partial<PatientProfile>) =>
      mutate((current) => {
        const id = current.session?.patientId;
        if (!id) return current;
        return {
          ...current,
          patients: current.patients.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        };
      }),
    [mutate],
  );

  const updateDoctorProfile = useCallback(
    (patch: Partial<DoctorProfile>) =>
      mutate((current) => {
        const id = current.session?.doctorId;
        if (!id) return current;
        return {
          ...current,
          doctors: current.doctors.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        };
      }),
    [mutate],
  );

  /* ---- medication ---- */
  const addMedicine = useCallback(
    (medicine: Omit<Medicine, 'patientId'>, patientId?: string) =>
      mutate((current) => {
        const target = patientId ?? current.session?.patientId;
        if (!target) return current;
        return { ...current, medicines: [{ ...medicine, patientId: target }, ...current.medicines] };
      }),
    [mutate],
  );

  const removeMedicine = useCallback(
    (id: string) =>
      mutate((current) => ({ ...current, medicines: current.medicines.filter((m) => m.id !== id) })),
    [mutate],
  );

  const addSchedule = useCallback(
    (entry: Omit<ScheduleEntry, 'patientId'>, patientId?: string) =>
      mutate((current) => {
        const target = patientId ?? current.session?.patientId;
        if (!target) return current;
        return { ...current, schedules: [...current.schedules, { ...entry, patientId: target }] };
      }),
    [mutate],
  );

  const updateSchedule = useCallback(
    (entry: ScheduleEntry) =>
      mutate((current) => ({
        ...current,
        schedules: current.schedules.map((s) => (s.id === entry.id ? entry : s)),
      })),
    [mutate],
  );

  const removeSchedule = useCallback(
    (id: string) =>
      mutate((current) => ({ ...current, schedules: current.schedules.filter((s) => s.id !== id) })),
    [mutate],
  );

  const recordDose = useCallback(
    (occurrence: DoseOccurrence, status: DoseAction, snoozeMinutes = 10) =>
      mutate((current) => {
        const patientId = current.session?.patientId;
        if (!patientId) return current;

        const record: DoseRecord = {
          occurrenceId: occurrence.id,
          patientId,
          scheduleId: occurrence.scheduleId,
          medicineName: occurrence.medicineName,
          strengthLabel: formatStrength(occurrence.strength),
          date: occurrence.date,
          time: occurrence.time,
          status,
          recordedAt: new Date().toISOString(),
          ...(status === 'snoozed' ? { snoozeUntil: Date.now() + snoozeMinutes * 60_000 } : {}),
        };

        const already = current.doseRecords.find((r) => r.occurrenceId === occurrence.id);

        // Taking a dose consumes stock, so refill forecasts stay honest.
        const medicines =
          status === 'taken' && already?.status !== 'taken'
            ? current.medicines.map((m) =>
                m.patientId === patientId &&
                m.name.toLowerCase() === occurrence.medicineName.toLowerCase() &&
                typeof m.unitsLeft === 'number'
                  ? { ...m, unitsLeft: Math.max(0, m.unitsLeft - (m.unitsPerDose ?? 1)) }
                  : m,
              )
            : current.medicines;

        return {
          ...current,
          medicines,
          doseRecords: [
            ...current.doseRecords.filter((r) => r.occurrenceId !== occurrence.id),
            record,
          ],
        };
      }),
    [mutate],
  );

  const clearDose = useCallback(
    (occurrenceId: string) =>
      mutate((current) => ({
        ...current,
        doseRecords: current.doseRecords.filter((r) => r.occurrenceId !== occurrenceId),
      })),
    [mutate],
  );

  const addScan = useCallback(
    (scan: Omit<ScanResult, 'patientId'>) =>
      mutate((current) => {
        const patientId = current.session?.patientId;
        if (!patientId) return current;
        return { ...current, scans: [{ ...scan, patientId }, ...current.scans] };
      }),
    [mutate],
  );

  /* ---- clinic ---- */
  const bookAppointment = useCallback(
    (request: BookingRequest) => {
      const error = validateBooking(request, db.appointments);
      if (error) return { ok: false as const, error };
      const appointment = buildAppointment(request);
      mutate((current) => ({ ...current, appointments: [...current.appointments, appointment] }));
      return { ok: true as const, appointment };
    },
    [db.appointments, mutate],
  );

  const setAppointmentStatus = useCallback(
    (id: string, status: AppointmentStatus, notes?: string) =>
      mutate((current) => ({
        ...current,
        appointments: current.appointments.map((a) =>
          a.id === id
            ? {
                ...a,
                status,
                notes: notes ?? a.notes,
                checkedInAt: status === 'checked_in' ? new Date().toISOString() : a.checkedInAt,
                completedAt: status === 'completed' ? new Date().toISOString() : a.completedAt,
              }
            : a,
        ),
      })),
    [mutate],
  );

  const addClinicalNote = useCallback(
    (note: Omit<ClinicalNote, 'id' | 'createdAt'>) =>
      mutate((current) => ({
        ...current,
        notes: [{ ...note, id: createId('note'), createdAt: new Date().toISOString() }, ...current.notes],
      })),
    [mutate],
  );

  const addPrescription = useCallback(
    (prescription: Omit<Prescription, 'id' | 'issuedAt' | 'addedToSchedule'>) =>
      mutate((current) => ({
        ...current,
        prescriptions: [
          {
            ...prescription,
            id: createId('rx'),
            issuedAt: new Date().toISOString(),
            addedToSchedule: false,
          },
          ...current.prescriptions,
        ],
      })),
    [mutate],
  );

  /** Patient pulls a doctor's prescription into their own medication schedule. */
  const adoptPrescription = useCallback(
    (prescriptionId: string) =>
      mutate((current) => {
        const rx = current.prescriptions.find((p) => p.id === prescriptionId);
        if (!rx || rx.addedToSchedule) return current;

        const now = new Date();
        const entries: ScheduleEntry[] = rx.items.map((item, index) => ({
          id: createId(`sch${index}`),
          patientId: rx.patientId,
          medicineName: item.medicineName,
          strength: item.strength,
          form: item.form,
          frequency: item.frequency,
          times: item.times,
          startDate: toISODate(now),
          weekday: null,
          notes: item.instructions,
          active: true,
          createdAt: now.toISOString(),
          prescriptionId: rx.id,
        }));

        return {
          ...current,
          schedules: [...current.schedules, ...entries],
          prescriptions: current.prescriptions.map((p) =>
            p.id === rx.id ? { ...p, addedToSchedule: true } : p,
          ),
        };
      }),
    [mutate],
  );

  const addVital = useCallback(
    (reading: Omit<VitalReading, 'id'>) =>
      mutate((current) => ({
        ...current,
        vitals: [{ ...reading, id: createId('vit') }, ...current.vitals],
      })),
    [mutate],
  );

  const setVitalTarget = useCallback(
    (target: Omit<VitalTarget, 'id' | 'setAt'>) =>
      mutate((current) => {
        const existing = current.vitalTargets.find(
          (v) => v.patientId === target.patientId && v.type === target.type,
        );
        const next: VitalTarget = {
          ...target,
          id: existing?.id ?? createId('tgt'),
          setAt: new Date().toISOString(),
        };
        return {
          ...current,
          vitalTargets: existing
            ? current.vitalTargets.map((v) => (v.id === existing.id ? next : v))
            : [...current.vitalTargets, next],
        };
      }),
    [mutate],
  );

  /* ---- notifications ---- */
  const sendNotification = useCallback(
    (input: {
      toPatientId?: string | null;
      toRole?: 'patient' | 'doctor' | 'hospital_admin' | null;
      kind: NotificationKind;
      title: string;
      body: string;
      actionScreen?: string | null;
    }) =>
      mutate((current) => {
        const sender = current.accounts.find((a) => a.id === current.session?.accountId);
        const notification: StoredNotification = {
          id: createId('ntf'),
          toPatientId: input.toPatientId ?? null,
          toRole: input.toRole ?? null,
          fromAccountId: sender?.id ?? 'system',
          fromName: sender?.fullName ?? 'MediCare Voice',
          kind: input.kind,
          title: input.title,
          body: input.body,
          createdAt: new Date().toISOString(),
          readAt: null,
          actionScreen: input.actionScreen ?? null,
        };
        return { ...current, notifications: [notification, ...current.notifications] };
      }),
    [mutate],
  );

  const markNotificationRead = useCallback(
    (id: string) =>
      mutate((current) => ({
        ...current,
        notifications: current.notifications.map((n) =>
          n.id === id && n.readAt === null ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      })),
    [mutate],
  );

  const markAllNotificationsRead = useCallback(
    () =>
      mutate((current) => {
        const patientId = current.session?.patientId ?? null;
        const role = current.session?.role ?? null;
        const stamp = new Date().toISOString();
        return {
          ...current,
          notifications: current.notifications.map((n) =>
            n.readAt === null &&
            ((patientId && n.toPatientId === patientId) || (role && n.toRole === role))
              ? { ...n, readAt: stamp }
              : n,
          ),
        };
      }),
    [mutate],
  );

  /* ---- wellness ---- */
  const logActivity = useCallback(
    (patch: Partial<Omit<ActivityLog, 'id' | 'patientId' | 'date'>>) =>
      mutate((current) => {
        const patientId = current.session?.patientId;
        if (!patientId) return current;
        const date = toISODate(new Date());
        const existing = current.activity.find(
          (a) => a.patientId === patientId && a.date === date,
        );
        const next: ActivityLog = {
          id: existing?.id ?? createId('act'),
          patientId,
          date,
          steps: existing?.steps ?? 0,
          activeMinutes: existing?.activeMinutes ?? 0,
          sleepHours: existing?.sleepHours ?? 0,
          waterGlasses: existing?.waterGlasses ?? 0,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        return {
          ...current,
          activity: existing
            ? current.activity.map((a) => (a.id === existing.id ? next : a))
            : [...current.activity, next],
        };
      }),
    [mutate],
  );

  const logMood = useCallback(
    (entry: { mood: FivePoint; stress: FivePoint; sleepQuality: FivePoint; note: string }) =>
      mutate((current) => {
        const patientId = current.session?.patientId;
        if (!patientId) return current;
        const date = toISODate(new Date());
        const existing = current.moods.find((m) => m.patientId === patientId && m.date === date);
        const next: MoodEntry = {
          id: existing?.id ?? createId('mood'),
          patientId,
          date,
          ...entry,
          createdAt: new Date().toISOString(),
        };
        return {
          ...current,
          moods: existing
            ? current.moods.map((m) => (m.id === existing.id ? next : m))
            : [...current.moods, next],
        };
      }),
    [mutate],
  );

  const updateGoal = useCallback(
    (patch: Partial<WellnessGoal>) =>
      mutate((current) => {
        const patientId = current.session?.patientId;
        if (!patientId) return current;
        const existing = current.goals.find((g) => g.patientId === patientId);
        const next: WellnessGoal = {
          patientId,
          ...DEFAULT_WELLNESS_GOAL,
          ...existing,
          ...patch,
        };
        return {
          ...current,
          goals: existing
            ? current.goals.map((g) => (g.patientId === patientId ? next : g))
            : [...current.goals, next],
        };
      }),
    [mutate],
  );

  const resetDemoData = useCallback(async () => {
    const fresh = await buildDemoDatabase();
    writeDatabase(fresh);
    setDb(fresh);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      db,
      session,
      account,
      patient,
      doctor,
      hospital,
      t,
      locale,
      settings,
      medicines: own.medicines,
      schedules: own.schedules,
      records: own.records,
      scans: own.scans,
      appointments: own.appointments,
      prescriptions: own.prescriptions,
      notes: own.notes,
      vitals: own.vitals,
      vitalTargets: own.vitalTargets,
      activity: own.activity,
      moods: own.moods,
      goal: own.goal,
      lastScan: own.scans[0] ?? null,
      insights,
      wellbeing,
      notifications,
      unreadNotifications: unreadCount(notifications),
      bundleFor,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      patchSettings,
      updatePatientProfile,
      updateDoctorProfile,
      addMedicine,
      removeMedicine,
      addSchedule,
      updateSchedule,
      removeSchedule,
      recordDose,
      clearDose,
      addScan,
      bookAppointment,
      setAppointmentStatus,
      addClinicalNote,
      addPrescription,
      adoptPrescription,
      addVital,
      setVitalTarget,
      sendNotification,
      markNotificationRead,
      markAllNotificationsRead,
      logActivity,
      logMood,
      updateGoal,
      resetDemoData,
    }),
    [
      ready, db, session, account, patient, doctor, hospital, t, locale, settings, own, insights,
      wellbeing, notifications, sendNotification, markNotificationRead, markAllNotificationsRead,
      bundleFor, signUp, signIn, signInWithGoogle, signOut, patchSettings, updatePatientProfile,
      updateDoctorProfile, addMedicine, removeMedicine, addSchedule, updateSchedule, removeSchedule,
      recordDose, clearDose, addScan, bookAppointment, setAppointmentStatus, addClinicalNote,
      addPrescription, adoptPrescription, addVital, setVitalTarget, logActivity, logMood,
      updateGoal, resetDemoData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export type { VitalType };
