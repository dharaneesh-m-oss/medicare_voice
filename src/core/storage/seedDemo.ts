/**
 * THE DEMO WORLD.
 *
 * One hospital, three doctors, four patients, a working appointment book,
 * consultation notes, prescriptions, vitals, activity and mood history — enough
 * for every screen and every insight to have something real to show on a fresh
 * install. All of it is fictional sample data.
 */

import type {
  Account,
  DoctorProfile,
  Hospital,
  PatientProfile,
  Role,
} from '../auth/types';
import { hashPassword, randomSalt } from '../auth/crypto';
import type {
  Appointment,
  AppointmentStatus,
  ClinicalNote,
  Prescription,
  VitalReading,
  VitalTarget,
} from '../clinic/types';
import { DEFAULT_SETTINGS } from '../types';
import { addDays, toISODate } from '../utils/date';
import type { ActivityLog, MoodEntry, WellnessGoal } from '../wellness/types';
import { DEFAULT_WELLNESS_GOAL, type FivePoint } from '../wellness/types';
import { emptyDatabase, type Database } from './Database';
import {
  buildSeedMedicines,
  buildSeedRecords,
  buildSeedSchedules,
  buildSimpleRecords,
  buildSimpleSchedule,
} from './medicationSeed';

export const DEMO_PASSWORD = 'demo1234';

export interface DemoLogin {
  email: string;
  role: Role;
  name: string;
  descriptionKey: string;
}

export const DEMO_LOGINS: DemoLogin[] = [
  {
    email: 'kamala@demo.health',
    role: 'patient',
    name: 'Kamala Raman',
    descriptionKey: 'auth.demo_patient',
  },
  {
    email: 'anitha@demo.health',
    role: 'doctor',
    name: 'Dr. Anitha Krishnan',
    descriptionKey: 'auth.demo_doctor',
  },
  {
    email: 'admin@demo.health',
    role: 'hospital_admin',
    name: 'Sundaram Hospital Desk',
    descriptionKey: 'auth.demo_admin',
  },
];

/* Deterministic pseudo-random so the demo looks the same every run. */
function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

const HOSPITAL_ID = 'hos_sundaram';
const DOC = { anitha: 'doc_anitha', ravi: 'doc_ravi', meera: 'doc_meera' };
const PAT = {
  kamala: 'pat_kamala',
  ganesan: 'pat_ganesan',
  fatima: 'pat_fatima',
  suresh: 'pat_suresh',
  // These two have a doctor's follow-up request and nothing on the book —
  // exactly the people the front desk exists to chase.
  meenakshi: 'pat_meenakshi',
  arun: 'pat_arun',
};

async function localAccount(
  id: string,
  role: Role,
  fullName: string,
  email: string,
  phone: string,
  now: Date,
): Promise<Account> {
  const salt = randomSalt();
  return {
    id,
    role,
    fullName,
    email,
    phone,
    photoUrl: null,
    provider: 'local',
    createdAt: now.toISOString(),
    lastLoginAt: null,
    passwordHash: await hashPassword(DEMO_PASSWORD, salt),
    passwordSalt: salt,
  };
}

function hospital(): Hospital {
  return {
    id: HOSPITAL_ID,
    name: 'Sundaram Multispeciality Hospital',
    city: 'Chennai',
    address: '14, Anna Salai, Teynampet, Chennai 600018',
    phone: '044 4000 1200',
    departments: [
      'General Medicine',
      'Cardiology',
      'Diabetology',
      'Psychiatry',
      'Orthopaedics',
    ],
  };
}

function doctors(now: Date): DoctorProfile[] {
  // Established doctors joined long ago, so the "New" badge in the patient
  // directory only marks someone who has actually just registered.
  const joined = (monthsAgo: number) => addDays(now, -monthsAgo * 30).toISOString();
  return [
    {
      id: DOC.anitha,
      accountId: 'acc_anitha',
      fullName: 'Dr. Anitha Krishnan',
      specialization: 'General Medicine',
      registrationNumber: 'TN/MC/48120',
      hospitalId: HOSPITAL_ID,
      qualifications: 'MBBS, MD (General Medicine)',
      experienceYears: 14,
      languages: ['Tamil', 'English'],
      consultationFee: 400,
      roomNumber: 'OPD 3',
      availability: [1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        start: '09:00',
        end: '13:00',
      })),
      slotMinutes: 20,
      createdAt: joined(38),
    },
    {
      id: DOC.ravi,
      accountId: 'acc_ravi',
      fullName: 'Dr. Ravi Shankar',
      specialization: 'Cardiology',
      registrationNumber: 'TN/MC/39877',
      hospitalId: HOSPITAL_ID,
      qualifications: 'MBBS, MD, DM (Cardiology)',
      experienceYears: 19,
      languages: ['Tamil', 'English', 'Hindi'],
      consultationFee: 700,
      roomNumber: 'Cardio 1',
      availability: [
        { weekday: 1, start: '10:00', end: '13:00' },
        { weekday: 3, start: '10:00', end: '13:00' },
        { weekday: 5, start: '10:00', end: '13:00' },
        { weekday: 5, start: '17:00', end: '19:00' },
      ],
      slotMinutes: 30,
      createdAt: joined(19),
    },
    {
      id: DOC.meera,
      accountId: 'acc_meera',
      fullName: 'Dr. Meera Nair',
      specialization: 'Psychiatry',
      registrationNumber: 'TN/MC/52341',
      hospitalId: HOSPITAL_ID,
      qualifications: 'MBBS, MD (Psychiatry)',
      experienceYears: 9,
      languages: ['Malayalam', 'English', 'Tamil'],
      consultationFee: 600,
      roomNumber: 'OPD 7',
      availability: [
        { weekday: 2, start: '11:00', end: '14:00' },
        { weekday: 4, start: '11:00', end: '14:00' },
        { weekday: 6, start: '11:00', end: '14:00' },
      ],
      slotMinutes: 30,
      createdAt: joined(0.2),
    },
  ];
}

function patients(now: Date): PatientProfile[] {
  const createdAt = now.toISOString();
  const base = {
    hospitalId: HOSPITAL_ID,
    city: 'Chennai',
    createdAt,
  };
  return [
    {
      ...base,
      id: PAT.kamala,
      accountId: 'acc_kamala',
      fullName: 'Kamala Raman',
      dateOfBirth: '1958-04-12',
      gender: 'female',
      bloodGroup: 'B+',
      heightCm: 154,
      weightKg: 62,
      phone: '+91 98400 11223',
      address: '22/5, Bharathi Street, T. Nagar',
      allergies: ['Sulfa drugs'],
      conditions: ['Type 2 diabetes', 'Hypertension'],
      emergencyContactName: 'Sundar Raman (son)',
      emergencyContactPhone: '+91 98400 44556',
      primaryDoctorId: DOC.anitha,
      abhaId: '12-3456-7890-1234',
    },
    {
      ...base,
      id: PAT.ganesan,
      accountId: 'acc_ganesan',
      fullName: 'Ganesan Murthy',
      dateOfBirth: '1952-09-30',
      gender: 'male',
      bloodGroup: 'O+',
      heightCm: 167,
      weightKg: 71,
      phone: '+91 90030 55110',
      address: '8, Lake View Road, West Mambalam',
      allergies: [],
      conditions: ['Hypertension', 'Osteoarthritis'],
      emergencyContactName: 'Lakshmi Ganesan (wife)',
      emergencyContactPhone: '+91 90030 55111',
      primaryDoctorId: DOC.anitha,
      abhaId: null,
    },
    {
      ...base,
      id: PAT.fatima,
      accountId: 'acc_fatima',
      fullName: 'Fatima Begum',
      dateOfBirth: '1960-01-18',
      gender: 'female',
      bloodGroup: 'A+',
      heightCm: 158,
      weightKg: 68,
      phone: '+91 94440 78120',
      address: '3rd Cross, Triplicane High Road',
      allergies: ['Penicillin'],
      conditions: ['Type 2 diabetes'],
      emergencyContactName: 'Imran Begum (son)',
      emergencyContactPhone: '+91 94440 78121',
      primaryDoctorId: DOC.ravi,
      abhaId: null,
    },
    {
      ...base,
      id: PAT.suresh,
      accountId: 'acc_suresh',
      fullName: 'Suresh Kumar',
      dateOfBirth: '1967-06-05',
      gender: 'male',
      bloodGroup: 'AB+',
      heightCm: 172,
      weightKg: 84,
      phone: '+91 89390 22004',
      address: '11, Gandhi Nagar, Adyar',
      allergies: [],
      conditions: ['High cholesterol'],
      emergencyContactName: 'Priya Suresh (wife)',
      emergencyContactPhone: '+91 89390 22005',
      primaryDoctorId: DOC.anitha,
      abhaId: null,
    },
    {
      ...base,
      id: PAT.meenakshi,
      accountId: 'acc_meenakshi',
      fullName: 'Meenakshi Iyer',
      dateOfBirth: '1954-11-22',
      gender: 'female',
      bloodGroup: 'O-',
      heightCm: 151,
      weightKg: 58,
      phone: '+91 93810 44320',
      address: '5, Kamaraj Street, Villivakkam',
      allergies: [],
      conditions: ['Hypothyroidism'],
      emergencyContactName: 'Anand Iyer (son)',
      emergencyContactPhone: '+91 93810 44321',
      primaryDoctorId: DOC.anitha,
      abhaId: null,
    },
    {
      ...base,
      id: PAT.arun,
      accountId: 'acc_arun',
      fullName: 'Arun Prasad',
      dateOfBirth: '1962-02-14',
      gender: 'male',
      bloodGroup: 'B+',
      heightCm: 170,
      weightKg: 78,
      phone: '+91 98847 66210',
      address: '19, Bazaar Road, Saidapet',
      allergies: ['Iodine contrast'],
      conditions: ['Type 2 diabetes'],
      emergencyContactName: 'Vidya Prasad (wife)',
      emergencyContactPhone: '+91 98847 66211',
      primaryDoctorId: DOC.ravi,
      abhaId: null,
    },
  ];
}

function appointment(
  id: string,
  patientId: string,
  doctorId: string,
  date: string,
  time: string,
  status: AppointmentStatus,
  reason: string,
  durationMinutes = 20,
): Appointment {
  return {
    id,
    patientId,
    doctorId,
    hospitalId: HOSPITAL_ID,
    date,
    time,
    durationMinutes,
    mode: 'in_person',
    status,
    reason,
    notes: '',
    createdAt: new Date().toISOString(),
    createdByAccountId: 'acc_admin',
    checkedInAt: status === 'checked_in' ? new Date().toISOString() : null,
    completedAt: status === 'completed' ? new Date().toISOString() : null,
    followUpForAppointmentId: null,
  };
}

function appointments(now: Date): Appointment[] {
  const today = toISODate(now);
  const inTwoDays = toISODate(addDays(now, 2));
  const inFiveDays = toISODate(addDays(now, 5));
  const threeWeeksAgo = toISODate(addDays(now, -21));
  const sixWeeksAgo = toISODate(addDays(now, -42));

  return [
    // Today's clinic — what the doctor and the hospital desk see.
    appointment('apt_t1', PAT.ganesan, DOC.anitha, today, '09:00', 'checked_in', 'Routine follow-up'),
    appointment('apt_t2', PAT.fatima, DOC.anitha, today, '09:40', 'confirmed', 'Medicine review'),
    appointment('apt_t3', PAT.suresh, DOC.anitha, today, '10:20', 'completed', 'Report review'),
    appointment('apt_t4', PAT.ganesan, DOC.ravi, today, '11:00', 'confirmed', 'New symptom', 30),
    appointment('apt_t5', PAT.suresh, DOC.meera, today, '11:30', 'requested', 'New symptom', 30),

    // Kamala's next checkup — the one the patient home screen shows.
    appointment('apt_next', PAT.kamala, DOC.anitha, inTwoDays, '09:20', 'confirmed', 'Routine follow-up'),
    appointment('apt_f1', PAT.fatima, DOC.ravi, inFiveDays, '10:30', 'requested', 'Second opinion', 30),

    // History.
    appointment('apt_p1', PAT.kamala, DOC.anitha, threeWeeksAgo, '09:20', 'completed', 'Medicine review'),
    appointment('apt_p2', PAT.kamala, DOC.ravi, sixWeeksAgo, '10:00', 'completed', 'Report review', 30),
    appointment('apt_p3', PAT.ganesan, DOC.anitha, threeWeeksAgo, '10:00', 'no_show', 'Routine follow-up'),
  ];
}

function notes(now: Date): ClinicalNote[] {
  return [
    {
      id: 'note_1',
      patientId: PAT.kamala,
      doctorId: DOC.anitha,
      appointmentId: 'apt_p1',
      date: toISODate(addDays(now, -21)),
      complaint: 'Occasional giddiness in the evening. Reports missing the night dose often.',
      observations:
        'BP 146/90. Weight stable. Home sugar log irregular. Medicine box shared with family.',
      advice:
        'Continue current medicines. Keep the evening dose next to the bedside clock. Bring the sugar log next visit.',
      followUpDate: toISODate(addDays(now, 2)),
      createdAt: addDays(now, -21).toISOString(),
    },
    {
      id: 'note_2',
      patientId: PAT.kamala,
      doctorId: DOC.ravi,
      appointmentId: 'apt_p2',
      date: toISODate(addDays(now, -42)),
      complaint: 'Routine cardiac review.',
      observations: 'ECG normal. No chest pain. BP mildly elevated at clinic.',
      advice: 'Home BP twice a week. Review in three months.',
      followUpDate: null,
      createdAt: addDays(now, -42).toISOString(),
    },
    {
      // Follow-up date has already passed and nothing is booked -> the desk
      // sees this as overdue.
      id: 'note_3',
      patientId: PAT.meenakshi,
      doctorId: DOC.anitha,
      appointmentId: null,
      date: toISODate(addDays(now, -28)),
      complaint: 'Tiredness and weight gain over two months.',
      observations: 'Thyroid function repeated. Pulse 62. BP 124/78.',
      advice: 'Repeat the thyroid test in three weeks and bring the report.',
      followUpDate: toISODate(addDays(now, -7)),
      createdAt: addDays(now, -28).toISOString(),
    },
    {
      // Due in a couple of days, still unbooked.
      id: 'note_4',
      patientId: PAT.arun,
      doctorId: DOC.ravi,
      appointmentId: null,
      date: toISODate(addDays(now, -19)),
      complaint: 'Sugar readings high after festival week.',
      observations: 'Fasting sugar 168. Advised diet review before changing anything.',
      advice: 'Bring a two-week sugar log to the next visit.',
      followUpDate: toISODate(addDays(now, 2)),
      createdAt: addDays(now, -19).toISOString(),
    },
  ];
}

function prescriptions(now: Date): Prescription[] {
  return [
    {
      id: 'rx_1',
      patientId: PAT.kamala,
      doctorId: DOC.anitha,
      appointmentId: 'apt_p1',
      issuedAt: addDays(now, -21).toISOString(),
      items: [
        {
          medicineName: 'Metformin',
          strength: { value: 500, unit: 'mg' },
          form: 'tablet',
          frequency: 'twice_daily',
          times: ['08:00', '20:00'],
          durationDays: 90,
          instructions: 'After food',
        },
        {
          medicineName: 'Amlodipine',
          strength: { value: 5, unit: 'mg' },
          form: 'tablet',
          frequency: 'once_daily',
          times: ['13:00'],
          durationDays: 90,
          instructions: 'After lunch',
        },
      ],
      notes: 'Continue for three months, review at next visit.',
      addedToSchedule: true,
    },
    {
      // Issued at the last cardiology visit and NOT yet pulled into the
      // schedule — the patient screen offers a one-tap "add to my schedule".
      id: 'rx_2',
      patientId: PAT.kamala,
      doctorId: DOC.ravi,
      appointmentId: 'apt_p2',
      issuedAt: addDays(now, -42).toISOString(),
      items: [
        {
          medicineName: 'Atorvastatin',
          strength: { value: 10, unit: 'mg' },
          form: 'tablet',
          frequency: 'once_daily',
          times: ['21:00'],
          durationDays: 90,
          instructions: 'At night',
        },
      ],
      notes: 'Start after the current course finishes.',
      addedToSchedule: false,
    },
  ];
}

function vitals(now: Date): VitalReading[] {
  const random = rng(42);
  const out: VitalReading[] = [];

  // Blood pressure every 4 days for 6 weeks, drifting slightly upward.
  for (let i = 10; i >= 0; i -= 1) {
    const day = addDays(now, -i * 4);
    const systolic = Math.round(128 + i * -1.2 + random() * 8);
    const diastolic = Math.round(80 + i * -0.4 + random() * 6);
    out.push({
      id: `vit_bp_${i}`,
      patientId: PAT.kamala,
      type: 'blood_pressure',
      value: i === 0 ? 148 : systolic,
      secondaryValue: i === 0 ? 92 : diastolic,
      measuredAt: day.toISOString(),
      source: i % 3 === 0 ? 'clinic' : 'self',
      note: '',
    });
  }

  // Fasting blood sugar, weekly.
  for (let i = 6; i >= 0; i -= 1) {
    out.push({
      id: `vit_sugar_${i}`,
      patientId: PAT.kamala,
      type: 'blood_sugar',
      value: Math.round(118 + random() * 22),
      secondaryValue: null,
      measuredAt: addDays(now, -i * 7).toISOString(),
      source: 'self',
      note: 'Fasting',
    });
  }

  // Weight, fortnightly.
  for (let i = 3; i >= 0; i -= 1) {
    out.push({
      id: `vit_weight_${i}`,
      patientId: PAT.kamala,
      type: 'weight',
      value: Number((62.8 - i * 0.3).toFixed(1)),
      secondaryValue: null,
      measuredAt: addDays(now, -i * 14).toISOString(),
      source: 'self',
      note: '',
    });
  }

  return out;
}

function vitalTargets(now: Date): VitalTarget[] {
  const setAt = addDays(now, -21).toISOString();
  return [
    {
      id: 'tgt_bp',
      patientId: PAT.kamala,
      type: 'blood_pressure',
      min: 100,
      max: 140,
      secondaryMin: 60,
      secondaryMax: 90,
      setByDoctorId: DOC.anitha,
      setAt,
    },
    {
      id: 'tgt_sugar',
      patientId: PAT.kamala,
      type: 'blood_sugar',
      min: 70,
      max: 140,
      secondaryMin: null,
      secondaryMax: null,
      setByDoctorId: DOC.anitha,
      setAt,
    },
  ];
}

function activity(now: Date): ActivityLog[] {
  const random = rng(7);
  const out: ActivityLog[] = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = toISODate(addDays(now, -offset));
    const weekend = new Date(`${date}T00:00:00`).getDay() % 6 === 0;
    out.push({
      id: `act_${date}`,
      patientId: PAT.kamala,
      date,
      steps: Math.round((weekend ? 2100 : 3400) + random() * 1800 - offset * 40),
      activeMinutes: Math.round(14 + random() * 16),
      sleepHours: Number((5.6 + random() * 1.8).toFixed(1)),
      waterGlasses: Math.round(4 + random() * 4),
      updatedAt: addDays(now, -offset).toISOString(),
    });
  }
  return out;
}

function moods(now: Date): MoodEntry[] {
  // A realistic dip in the last three days, so the supportive (never
  // diagnostic) mental-wellbeing insight has something to respond to.
  const pattern: { mood: FivePoint; stress: FivePoint; sleep: FivePoint; note: string }[] = [
    { mood: 4, stress: 2, sleep: 4, note: '' },
    { mood: 3, stress: 3, sleep: 3, note: '' },
    { mood: 4, stress: 2, sleep: 4, note: 'Grandchildren visited' },
    { mood: 3, stress: 3, sleep: 3, note: '' },
    { mood: 3, stress: 4, sleep: 2, note: '' },
    { mood: 2, stress: 4, sleep: 2, note: 'Did not sleep well' },
    { mood: 2, stress: 4, sleep: 2, note: '' },
    { mood: 2, stress: 5, sleep: 2, note: 'Feeling alone in the evenings' },
  ];

  return pattern.map((entry, index) => {
    const offset = pattern.length - 1 - index;
    const date = toISODate(addDays(now, -offset));
    return {
      id: `mood_${date}`,
      patientId: PAT.kamala,
      date,
      mood: entry.mood,
      stress: entry.stress,
      sleepQuality: entry.sleep,
      note: entry.note,
      createdAt: addDays(now, -offset).toISOString(),
    };
  });
}

function goals(): WellnessGoal[] {
  return [
    { patientId: PAT.kamala, ...DEFAULT_WELLNESS_GOAL },
    { patientId: PAT.ganesan, ...DEFAULT_WELLNESS_GOAL },
    { patientId: PAT.fatima, ...DEFAULT_WELLNESS_GOAL },
    { patientId: PAT.suresh, ...DEFAULT_WELLNESS_GOAL },
    { patientId: PAT.meenakshi, ...DEFAULT_WELLNESS_GOAL },
    { patientId: PAT.arun, ...DEFAULT_WELLNESS_GOAL },
  ];
}

/* ------------------------------------------------------------------ */

export async function buildDemoDatabase(now: Date = new Date()): Promise<Database> {
  const db = emptyDatabase();

  const accountSpecs: [string, Role, string, string, string][] = [
    ['acc_kamala', 'patient', 'Kamala Raman', 'kamala@demo.health', '+91 98400 11223'],
    ['acc_ganesan', 'patient', 'Ganesan Murthy', 'ganesan@demo.health', '+91 90030 55110'],
    ['acc_fatima', 'patient', 'Fatima Begum', 'fatima@demo.health', '+91 94440 78120'],
    ['acc_suresh', 'patient', 'Suresh Kumar', 'suresh@demo.health', '+91 89390 22004'],
    ['acc_meenakshi', 'patient', 'Meenakshi Iyer', 'meenakshi@demo.health', '+91 93810 44320'],
    ['acc_arun', 'patient', 'Arun Prasad', 'arun@demo.health', '+91 98847 66210'],
    ['acc_anitha', 'doctor', 'Dr. Anitha Krishnan', 'anitha@demo.health', '+91 98410 30001'],
    ['acc_ravi', 'doctor', 'Dr. Ravi Shankar', 'ravi@demo.health', '+91 98410 30002'],
    ['acc_meera', 'doctor', 'Dr. Meera Nair', 'meera@demo.health', '+91 98410 30003'],
    ['acc_admin', 'hospital_admin', 'Sundaram Hospital Desk', 'admin@demo.health', '044 4000 1200'],
  ];

  db.accounts = await Promise.all(
    accountSpecs.map(([id, role, name, email, phone]) =>
      localAccount(id, role, name, email, phone, now),
    ),
  );
  db.accounts.forEach((account) => {
    db.settings[account.id] = { ...DEFAULT_SETTINGS };
  });

  db.hospitals = [hospital()];
  db.doctors = doctors(now);
  db.patients = patients(now);
  db.appointments = appointments(now);
  db.notes = notes(now);
  db.prescriptions = prescriptions(now);
  db.vitals = vitals(now);
  db.vitalTargets = vitalTargets(now);
  db.activity = activity(now);
  db.moods = moods(now);
  db.goals = goals();

  // Kamala gets the full medication history; the others get a light schedule so
  // the doctor's patient list shows meaningful adherence.
  db.medicines = buildSeedMedicines(PAT.kamala, now);

  const ganesan = buildSimpleSchedule(PAT.ganesan, 'Telmisartan', 40, ['08:00'], now);
  const fatima = buildSimpleSchedule(PAT.fatima, 'Metformin', 500, ['08:00', '20:00'], now);
  const suresh = buildSimpleSchedule(PAT.suresh, 'Atorvastatin', 10, ['21:00'], now);
  const meenakshi = buildSimpleSchedule(PAT.meenakshi, 'Thyroxine', 50, ['07:00'], now);
  const arun = buildSimpleSchedule(PAT.arun, 'Metformin', 500, ['08:00', '20:00'], now);

  db.schedules = [
    ...buildSeedSchedules(PAT.kamala, now),
    ganesan,
    fatima,
    suresh,
    meenakshi,
    arun,
  ];

  // A spread of adherence, so the clinical lists show a real range.
  db.doseRecords = [
    ...buildSeedRecords(PAT.kamala, now),
    ...buildSimpleRecords(ganesan, 0.5, now),
    ...buildSimpleRecords(fatima, 0.93, now),
    ...buildSimpleRecords(suresh, 1, now),
    ...buildSimpleRecords(meenakshi, 0.86, now),
    ...buildSimpleRecords(arun, 0.64, now),
  ];
  db.scans = [];
  db.seededAt = now.toISOString();
  db.session = null;

  return db;
}
