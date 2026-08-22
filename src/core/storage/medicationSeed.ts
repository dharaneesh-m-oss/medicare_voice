/**
 * Medication demo data for one patient: cabinet, schedule and dose history.
 * Expiry dates come from the sample pack table so the "valid", "expiring soon"
 * and "expired" cases stay correct whenever the demo is run.
 */

import { SAMPLE_PACKS, resolveExpiry } from '../recognition/medicineDatabase';
import type { DoseRecord, Medicine, ScheduleEntry } from '../types';
import { addDays, toISODate } from '../utils/date';

export function scheduleIdsFor(patientId: string) {
  return {
    metformin: `sch_${patientId}_metformin`,
    amlodipine: `sch_${patientId}_amlodipine`,
    paracetamol: `sch_${patientId}_paracetamol`,
  };
}

function packExpiry(id: string, now: Date): string | null {
  const pack = SAMPLE_PACKS.find((p) => p.id === id);
  return pack ? resolveExpiry(pack, now) : null;
}

export function buildSeedMedicines(patientId: string, now: Date = new Date()): Medicine[] {
  const addedAt = now.toISOString();
  return [
    {
      id: `med_${patientId}_metformin`,
      patientId,
      name: 'Metformin',
      strength: { value: 500, unit: 'mg' },
      form: 'tablet',
      expiry: packExpiry('metformin-500', now),
      batchNumber: 'MF4271',
      notes: 'After food',
      addedAt,
      unitsLeft: 11, // twice daily -> about 5 days left, triggers the refill insight
      unitsPerDose: 1,
    },
    {
      id: `med_${patientId}_amlodipine`,
      patientId,
      name: 'Amlodipine',
      strength: { value: 5, unit: 'mg' },
      form: 'tablet',
      expiry: packExpiry('amlodipine-5', now),
      batchNumber: 'AM2260',
      addedAt,
      unitsLeft: 24,
      unitsPerDose: 1,
    },
    {
      id: `med_${patientId}_paracetamol`,
      patientId,
      name: 'Paracetamol',
      strength: { value: 500, unit: 'mg' },
      form: 'tablet',
      expiry: packExpiry('paracetamol-500', now), // already expired — demo case
      batchNumber: 'PC1194',
      notes: 'Only when there is fever',
      addedAt,
    },
    {
      id: `med_${patientId}_ambroxol`,
      patientId,
      name: 'Ambroxol',
      strength: { value: 30, unit: 'mg' },
      form: 'syrup',
      expiry: packExpiry('ambroxol-syrup', now), // expiring soon — demo case
      batchNumber: 'AX7741',
      addedAt,
    },
  ];
}

export function buildSeedSchedules(patientId: string, now: Date = new Date()): ScheduleEntry[] {
  const ids = scheduleIdsFor(patientId);
  const startDate = toISODate(addDays(now, -20));
  const createdAt = now.toISOString();
  return [
    {
      id: ids.metformin,
      patientId,
      medicineName: 'Metformin',
      strength: { value: 500, unit: 'mg' },
      form: 'tablet',
      frequency: 'twice_daily',
      times: ['08:00', '20:00'],
      startDate,
      notes: 'After food',
      active: true,
      createdAt,
    },
    {
      id: ids.amlodipine,
      patientId,
      medicineName: 'Amlodipine',
      strength: { value: 5, unit: 'mg' },
      form: 'tablet',
      frequency: 'once_daily',
      times: ['13:00'],
      startDate,
      notes: 'After lunch',
      active: true,
      createdAt,
    },
    {
      id: ids.paracetamol,
      patientId,
      medicineName: 'Paracetamol',
      strength: { value: 500, unit: 'mg' },
      form: 'tablet',
      frequency: 'as_needed',
      times: [],
      startDate,
      notes: 'Only when there is fever',
      active: true,
      createdAt,
    },
  ];
}

function record(
  patientId: string,
  scheduleId: string,
  medicineName: string,
  strengthLabel: string,
  date: string,
  time: string,
  status: DoseRecord['status'],
): DoseRecord {
  return {
    occurrenceId: `${scheduleId}@${date}@${time}`,
    patientId,
    scheduleId,
    medicineName,
    strengthLabel,
    date,
    time,
    status,
    recordedAt: new Date(`${date}T${time}:00`).toISOString(),
  };
}

/**
 * Fourteen days of outcomes. Morning and lunchtime doses are reliable; the
 * 8 PM dose is missed often — which is exactly the pattern the insights engine
 * is meant to notice and name.
 */
export function buildSeedRecords(patientId: string, now: Date = new Date()): DoseRecord[] {
  const ids = scheduleIdsFor(patientId);
  const out: DoseRecord[] = [];
  const eveningMisses = new Set([1, 3, 4, 7, 9, 10, 12]);

  for (let offset = 1; offset <= 14; offset += 1) {
    const date = toISODate(addDays(now, -offset));
    out.push(record(patientId, ids.metformin, 'Metformin', '500 mg', date, '08:00', 'taken'));
    out.push(
      record(
        patientId,
        ids.amlodipine,
        'Amlodipine',
        '5 mg',
        date,
        '13:00',
        offset === 6 ? 'not_taken' : 'taken',
      ),
    );
    out.push(
      record(
        patientId,
        ids.metformin,
        'Metformin',
        '500 mg',
        date,
        '20:00',
        eveningMisses.has(offset) ? 'not_taken' : 'taken',
      ),
    );
  }
  return out;
}

/** A lighter history for the secondary demo patients. */
export function buildSimpleSchedule(
  patientId: string,
  medicineName: string,
  strengthValue: number,
  times: string[],
  now: Date = new Date(),
): ScheduleEntry {
  return {
    id: `sch_${patientId}_${medicineName.toLowerCase()}`,
    patientId,
    medicineName,
    strength: { value: strengthValue, unit: 'mg' },
    form: 'tablet',
    frequency: times.length === 2 ? 'twice_daily' : 'once_daily',
    times,
    startDate: toISODate(addDays(now, -30)),
    notes: '',
    active: true,
    createdAt: now.toISOString(),
  };
}

/**
 * A dose history for a secondary demo patient, at a given adherence level, so
 * the doctor's list and the hospital registry show a realistic spread rather
 * than a column of zeros.
 */
export function buildSimpleRecords(
  entry: ScheduleEntry,
  takenRate: number,
  now: Date = new Date(),
): DoseRecord[] {
  const out: DoseRecord[] = [];
  let index = 0;
  for (let offset = 14; offset >= 1; offset -= 1) {
    const date = toISODate(addDays(now, -offset));
    for (const time of entry.times) {
      // Deterministic spread: every Nth dose is a miss.
      const miss = takenRate < 1 && index % Math.max(2, Math.round(1 / (1 - takenRate))) === 0;
      out.push({
        occurrenceId: `${entry.id}@${date}@${time}`,
        patientId: entry.patientId,
        scheduleId: entry.id,
        medicineName: entry.medicineName,
        strengthLabel: entry.strength ? `${entry.strength.value} ${entry.strength.unit}` : '',
        date,
        time,
        status: miss ? 'not_taken' : 'taken',
        recordedAt: new Date(`${date}T${time}:00`).toISOString(),
      });
      index += 1;
    }
  }
  return out;
}
