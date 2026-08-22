/**
 * OCR INTERFACE — second swap point.
 *
 * The pixel-to-text step is separate from the classifier on purpose: on the
 * Snapdragon build, text detection/recognition (ML Kit, PaddleOCR-lite or a
 * custom CRNN on the NPU) can be replaced independently of the medicine
 * classifier, and the field-parsing logic below is reused unchanged.
 */

import type { OcrFields, OcrLine } from '../types';

export interface OcrInput {
  imageDataUrl: string | null;
  /**
   * Demo only: text the demo recognition engine says is on the pack. A real OCR
   * engine ignores this and reads the image.
   */
  simulatedPackText?: string[];
}

export interface EngineOcr {
  lines: OcrLine[];
  fullText: string;
  fields: OcrFields;
}

export interface OcrEngine {
  readonly id: string;
  readonly displayName: string;
  readonly isSimulated: boolean;
  initialize(): Promise<void>;
  readText(input: OcrInput): Promise<EngineOcr>;
  dispose(): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Field parsing — REAL logic, shared by demo and production engines.  */
/* ------------------------------------------------------------------ */

const EXPIRY_PATTERNS: RegExp[] = [
  /\b(?:exp(?:iry)?|use\s*before|best\s*before|उपयोग|காலாவதி)\b[^0-9]{0,12}(\d{1,2}\s*[/\-.]\s*(?:\d{4}|\d{2}))/i,
  /\bexp\b[^0-9]{0,6}((?:\d{4}|\d{2})\s*[/\-.]\s*\d{1,2})/i,
];

const BATCH_PATTERNS: RegExp[] = [
  /\b(?:b\.?\s*no\.?|batch(?:\s*no\.?)?|lot)\b[^A-Z0-9]{0,6}([A-Z0-9-]{3,15})/i,
];

const MFG_PATTERNS: RegExp[] = [
  /\b(?:mfg|mfd|manufactured)\b[^0-9]{0,12}(\d{1,2}\s*[/\-.]\s*(?:\d{4}|\d{2}))/i,
];

const STRENGTH_PATTERN =
  /(\d+(?:\.\d+)?)\s*(mg|mcg|µg|g|ml|iu|%)\b/i;

/** Normalise "8/2027", "08-27", "2027/08" to "MM/YYYY". */
export function normaliseExpiry(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, '');
  let m = /^(\d{1,2})[/\-.](\d{4})$/.exec(cleaned);
  if (m) return `${m[1].padStart(2, '0')}/${m[2]}`;
  m = /^(\d{1,2})[/\-.](\d{2})$/.exec(cleaned);
  if (m) return `${m[1].padStart(2, '0')}/20${m[2]}`;
  m = /^(\d{4})[/\-.](\d{1,2})$/.exec(cleaned);
  if (m) return `${m[2].padStart(2, '0')}/${m[1]}`;
  return null;
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = p.exec(text);
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * Pull the structured fields out of raw OCR text. This runs on whatever the OCR
 * engine produced — demo text today, camera text tomorrow.
 */
export function parsePackFields(lines: string[]): OcrFields {
  const text = lines.join('\n');
  const fields: OcrFields = {};

  const rawExpiry = firstMatch(text, EXPIRY_PATTERNS);
  if (rawExpiry) {
    const norm = normaliseExpiry(rawExpiry);
    if (norm) fields.expiry = norm;
  }

  const batch = firstMatch(text, BATCH_PATTERNS);
  if (batch) fields.batch = batch.toUpperCase();

  const rawMfg = firstMatch(text, MFG_PATTERNS);
  if (rawMfg) {
    const norm = normaliseExpiry(rawMfg);
    if (norm) fields.mfg = norm;
  }

  // Strength: prefer a line that also carries a dosage-form word.
  const formLine =
    lines.find((l) => /(tablet|capsule|suspension|syrup|injection|drops)/i.test(l)) ??
    lines.find((l) => STRENGTH_PATTERN.test(l));
  if (formLine) {
    const m = STRENGTH_PATTERN.exec(formLine);
    if (m) fields.strengthText = `${m[1]} ${m[2].toLowerCase().replace('µg', 'mcg')}`;
    const nameMatch = /^([A-Za-z][A-Za-z\s-]{2,})/.exec(formLine.trim());
    if (nameMatch) fields.medicineName = nameMatch[1].trim();
  }

  return fields;
}
