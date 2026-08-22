/**
 * SCAN PIPELINE — wires the modules together in the order the product needs:
 *
 *   captured frame
 *      -> MedicineRecognitionEngine   (name / strength / form / confidence)
 *      -> OcrEngine                   (expiry / batch / printed strength)
 *      -> VerificationEngine          (expiry maths + schedule comparison)
 *      -> ScanResult                  (stored in local history)
 *
 * The UI calls exactly one function. Swapping either engine changes nothing here.
 */

import { getOcrEngine } from '../ocr';
import { getRecognitionEngine } from '../recognition';
import type {
  DoseRecord,
  OcrResult,
  RecognitionResult,
  ScanResult,
  ScheduleEntry,
} from '../types';
import { createId } from '../types';
import { verify } from '../verification/VerificationEngine';

export type ScanStage = 'recognising' | 'reading_text' | 'checking_expiry' | 'verifying' | 'done';

export interface ScanPipelineInput {
  imageDataUrl: string | null;
  samplePackId?: string | null;
  schedules: ScheduleEntry[];
  records: DoseRecord[];
  now?: Date;
  onStage?: (stage: ScanStage) => void;
}

export async function runScan(
  input: ScanPipelineInput,
): Promise<Omit<ScanResult, 'patientId'>> {
  const now = input.now ?? new Date();
  const recogniser = getRecognitionEngine();
  const ocr = getOcrEngine();

  /* 1 — medicine recognition */
  input.onStage?.('recognising');
  const tRec = performance.now();
  const engineResult = await recogniser.recognize({
    imageDataUrl: input.imageDataUrl,
    samplePackId: input.samplePackId ?? null,
    now,
  });
  const recognition: RecognitionResult = {
    medicineName: engineResult.medicineName,
    strength: engineResult.strength,
    dosageForm: engineResult.dosageForm,
    confidence: engineResult.confidence,
    candidates: engineResult.candidates,
    engine: recogniser.id,
    engineLabel: recogniser.displayName,
    isSimulated: recogniser.isSimulated,
    referenceId: engineResult.referenceId,
    simulatedPackText: engineResult.simulatedPackText,
    processingMs: Math.round(performance.now() - tRec),
  };

  /* 2 — printed text */
  input.onStage?.('reading_text');
  const tOcr = performance.now();
  const ocrResult = await ocr.readText({
    imageDataUrl: input.imageDataUrl,
    simulatedPackText: engineResult.simulatedPackText,
  });
  const ocrOut: OcrResult = {
    ...ocrResult,
    engine: ocr.id,
    engineLabel: ocr.displayName,
    isSimulated: ocr.isSimulated,
    processingMs: Math.round(performance.now() - tOcr),
  };

  /* 3 + 4 — expiry maths and schedule comparison */
  input.onStage?.('checking_expiry');
  input.onStage?.('verifying');
  const verification = verify({
    recognition,
    printedExpiry: ocrOut.fields.expiry ?? null,
    schedules: input.schedules,
    records: input.records,
    confidenceThreshold: recogniser.confidenceThreshold,
    now,
  });

  input.onStage?.('done');

  return {
    id: createId('scan'),
    imageDataUrl: input.imageDataUrl,
    recognition,
    ocr: ocrOut,
    verification,
    scannedAt: now.toISOString(),
  };
}
