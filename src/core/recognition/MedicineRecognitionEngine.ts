/**
 * MEDICINE RECOGNITION INTERFACE — the custom-AI integration point.
 *
 * Anything that can turn a captured frame into
 *   { medicineName, strength, dosageForm, confidence }
 * can be plugged in here. The prototype ships `MockRecognitionEngine`
 * (deterministic sample data). The production build will register the trained
 * lightweight CV model running on the Snapdragon NPU.
 *
 * Contract:
 *  - `initialize()` is called once before the first `recognize()`. Model loading,
 *    delegate selection and warm-up belong here.
 *  - `recognize()` must never throw for an unreadable image; it returns a result
 *    with low confidence instead, so the UI can ask the user to retry.
 *  - `isSimulated` must be truthful. The UI shows a banner based on it.
 */

import type { DosageForm, RecognitionCandidate, Strength } from '../types';

export interface RecognitionInput {
  /** JPEG/PNG data URL of the captured frame. */
  imageDataUrl: string | null;
  /**
   * Demo-mode hint: id of a sample pack the user explicitly chose.
   * A real engine ignores this field entirely.
   */
  samplePackId?: string | null;
  /** Wall clock used for expiry-relative sample data (injectable for tests). */
  now?: Date;
}

export interface EngineRecognition {
  medicineName: string;
  strength: Strength | null;
  dosageForm: DosageForm;
  /** 0..1 */
  confidence: number;
  candidates: RecognitionCandidate[];
  referenceId?: string;
  /** Only demo engines populate this. */
  simulatedPackText?: string[];
}

export interface MedicineRecognitionEngine {
  /** Stable machine id, e.g. "mock-recognition-v1" / "snapdragon-cv-v1". */
  readonly id: string;
  /** Human label shown in the UI. Demo engines must say so. */
  readonly displayName: string;
  /** True while no trained model is behind this engine. */
  readonly isSimulated: boolean;
  /** Minimum confidence below which the UI asks for a re-scan. */
  readonly confidenceThreshold: number;

  initialize(): Promise<void>;
  recognize(input: RecognitionInput): Promise<EngineRecognition>;
  dispose(): Promise<void>;
}
