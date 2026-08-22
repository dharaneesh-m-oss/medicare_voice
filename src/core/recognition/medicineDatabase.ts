/**
 * Sample medicine packs used by the DEMO recognition engine.
 *
 * IMPORTANT: this is reference data for a prototype, not a trained model and not a
 * medical database. It exists so the full scan -> verify -> remind -> history flow
 * can be demonstrated before the custom on-device model is trained.
 *
 * Expiry dates are stored as OFFSETS from the current month so that the "valid",
 * "expiring soon" and "expired" demo cases stay correct whenever the demo is run.
 */

import type { DosageForm, Strength } from '../types';

export interface SamplePack {
  id: string;
  medicineName: string;
  brandName: string;
  strength: Strength | null;
  strengthNote?: string;
  dosageForm: DosageForm;
  /** months from the current month; negative = already expired */
  expiryOffsetMonths: number;
  batchNumber: string;
  manufacturer: string;
  /** Accent colour for the rendered sample pack image. */
  color: string;
  /** Short plain-language purpose, used only as neutral context — never advice. */
  categoryKey: string;
}

export const SAMPLE_PACKS: SamplePack[] = [
  {
    id: 'metformin-500',
    medicineName: 'Metformin',
    brandName: 'GLUCOMET-500',
    strength: { value: 500, unit: 'mg' },
    dosageForm: 'tablet',
    expiryOffsetMonths: 18,
    batchNumber: 'MF4271',
    manufacturer: 'Nordis Healthcare',
    color: '#1f6feb',
    categoryKey: 'category.diabetes',
  },
  {
    id: 'metformin-1000',
    medicineName: 'Metformin',
    brandName: 'GLUCOMET-1000',
    strength: { value: 1000, unit: 'mg' },
    dosageForm: 'tablet',
    expiryOffsetMonths: 14,
    batchNumber: 'MF8830',
    manufacturer: 'Nordis Healthcare',
    color: '#0f4c9e',
    categoryKey: 'category.diabetes',
  },
  {
    id: 'paracetamol-500',
    medicineName: 'Paracetamol',
    brandName: 'CALPOL-500',
    strength: { value: 500, unit: 'mg' },
    dosageForm: 'tablet',
    expiryOffsetMonths: -7,
    batchNumber: 'PC1194',
    manufacturer: 'Vaidya Labs',
    color: '#b54708',
    categoryKey: 'category.pain_fever',
  },
  {
    id: 'amlodipine-5',
    medicineName: 'Amlodipine',
    brandName: 'AMLOSAFE-5',
    strength: { value: 5, unit: 'mg' },
    dosageForm: 'tablet',
    expiryOffsetMonths: 9,
    batchNumber: 'AM2260',
    manufacturer: 'Sunrise Pharma',
    color: '#7a3fbf',
    categoryKey: 'category.blood_pressure',
  },
  {
    id: 'atorvastatin-10',
    medicineName: 'Atorvastatin',
    brandName: 'LIPICLEAR-10',
    strength: { value: 10, unit: 'mg' },
    dosageForm: 'tablet',
    expiryOffsetMonths: 21,
    batchNumber: 'AT5512',
    manufacturer: 'Sunrise Pharma',
    color: '#0f766e',
    categoryKey: 'category.cholesterol',
  },
  {
    id: 'ambroxol-syrup',
    medicineName: 'Ambroxol',
    brandName: 'BROXOL SYRUP',
    strength: { value: 30, unit: 'mg' },
    strengthNote: 'per 5 ml',
    dosageForm: 'syrup',
    expiryOffsetMonths: 0, // expires this month -> "expiring soon" demo case
    batchNumber: 'AX7741',
    manufacturer: 'Vaidya Labs',
    color: '#a4162c',
    categoryKey: 'category.cough',
  },
  {
    id: 'amoxicillin-500',
    medicineName: 'Amoxicillin',
    brandName: 'AMOXIRICH-500',
    strength: { value: 500, unit: 'mg' },
    dosageForm: 'capsule',
    expiryOffsetMonths: 11,
    batchNumber: 'AX3391',
    manufacturer: 'Nordis Healthcare',
    color: '#6b4f00',
    categoryKey: 'category.antibiotic',
  },
];

/** Resolve a pack's expiry against today's date -> "YYYY-MM". */
export function resolveExpiry(pack: SamplePack, now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() + pack.expiryOffsetMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function printed(expiry: string): string {
  const [y, m] = expiry.split('-');
  return `${m}/${y}`;
}

function mfgPrinted(pack: SamplePack, now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth() + pack.expiryOffsetMonths - 24, 1);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * The text a camera would see on this pack. The demo recognition engine hands
 * this to the OCR module, which parses it with the same regexes it will use on
 * real on-device OCR output.
 */
export function packPrintedText(pack: SamplePack, now: Date = new Date()): string[] {
  const expiry = resolveExpiry(pack, now);
  const strengthText = pack.strength
    ? `${pack.strength.value} ${pack.strength.unit}${pack.strengthNote ? ' ' + pack.strengthNote : ''}`
    : '';
  const formWord =
    pack.dosageForm === 'tablet'
      ? 'TABLETS IP'
      : pack.dosageForm === 'capsule'
        ? 'CAPSULES IP'
        : pack.dosageForm === 'syrup'
          ? 'ORAL SUSPENSION IP'
          : 'IP';

  return [
    pack.brandName,
    `${pack.medicineName.toUpperCase()} ${formWord} ${strengthText}`.trim(),
    `Mfd. by ${pack.manufacturer}`,
    `B.No. ${pack.batchNumber}`,
    `MFG: ${mfgPrinted(pack, now)}`,
    `EXP: ${printed(expiry)}`,
    'Store below 30 C. Keep out of reach of children.',
    pack.dosageForm === 'syrup' ? '100 ml' : '10 units',
  ];
}

export function findPack(id: string): SamplePack | undefined {
  return SAMPLE_PACKS.find((p) => p.id === id);
}

/**
 * A rendered picture of the sample pack, used as the "captured image" in demo
 * mode so the workflow can be shown on a laptop with no camera. It is drawn from
 * the data above — it is deliberately not a photograph of a real product.
 */
export function renderPackImage(pack: SamplePack, now: Date = new Date()): string {
  const lines = packPrintedText(pack, now);
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const body = lines
    .slice(1)
    .map((l, i) => `<text x="34" y="${188 + i * 34}" class="l">${esc(l)}</text>`)
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${pack.color}"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <style>
      .l { font-family: 'Segoe UI', Arial, sans-serif; font-size: 22px; fill: #f8fafc; }
      .brand { font-family: 'Segoe UI', Arial, sans-serif; font-size: 44px; font-weight: 700; fill: #ffffff; }
      .tag { font-family: 'Segoe UI', Arial, sans-serif; font-size: 18px; fill: #cbd5f5; letter-spacing: 2px; }
    </style>
  </defs>
  <rect width="640" height="480" fill="#0b1220"/>
  <rect x="16" y="16" width="608" height="448" rx="22" fill="url(#g)"/>
  <text x="34" y="76" class="tag">SAMPLE PACK — DEMO DATA</text>
  <text x="34" y="132" class="brand">${esc(lines[0])}</text>
  <line x1="34" y1="152" x2="606" y2="152" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
  ${body}
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
