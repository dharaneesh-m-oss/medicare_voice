/**
 * DEMO RECOGNITION ENGINE.
 *
 * This engine does NOT look at the photograph. There is no trained model behind
 * it yet. It resolves a result from the local sample-pack table:
 *
 *   - Demo mode / sample picker  -> returns the chosen pack with high confidence.
 *   - Free camera capture        -> deterministically derives a pack from a hash
 *                                   of the frame and returns it with LOW
 *                                   confidence, which makes the UI show the
 *                                   "could not identify — choose the pack"
 *                                   fallback instead of pretending to be sure.
 *
 * Keeping the low-confidence path honest is deliberate: the demo must not look
 * like a working classifier when it is not one.
 */

import type { RecognitionCandidate } from '../types';
import type {
  EngineRecognition,
  MedicineRecognitionEngine,
  RecognitionInput,
} from './MedicineRecognitionEngine';
import { SAMPLE_PACKS, findPack, packPrintedText } from './medicineDatabase';

/** FNV-1a over a sampled subset of the data URL — stable, cheap, no deps. */
function hashImage(dataUrl: string): number {
  let h = 0x811c9dc5;
  const step = Math.max(1, Math.floor(dataUrl.length / 4096));
  for (let i = 0; i < dataUrl.length; i += step) {
    h ^= dataUrl.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export class MockRecognitionEngine implements MedicineRecognitionEngine {
  readonly id = 'mock-recognition-v1';
  readonly displayName = 'Demo Recognition Engine';
  readonly isSimulated = true;
  readonly confidenceThreshold = 0.75;

  private ready = false;

  async initialize(): Promise<void> {
    if (this.ready) return;
    // Stands in for model load + delegate warm-up on the real engine.
    await delay(120);
    this.ready = true;
  }

  async recognize(input: RecognitionInput): Promise<EngineRecognition> {
    if (!this.ready) await this.initialize();
    const now = input.now ?? new Date();

    // Simulated inference latency, in the range a small on-device CNN would take.
    await delay(650);

    const hinted = input.samplePackId ? findPack(input.samplePackId) : undefined;

    if (hinted) {
      const others: RecognitionCandidate[] = SAMPLE_PACKS.filter((p) => p.id !== hinted.id)
        .slice(0, 2)
        .map((p, i) => ({
          medicineName: `${p.medicineName} ${p.strength ? p.strength.value + ' ' + p.strength.unit : ''}`.trim(),
          confidence: Number((0.06 - i * 0.02).toFixed(2)),
        }));

      return {
        medicineName: hinted.medicineName,
        strength: hinted.strength,
        dosageForm: hinted.dosageForm,
        confidence: 0.94,
        candidates: [
          {
            medicineName: `${hinted.medicineName} ${hinted.strength ? hinted.strength.value + ' ' + hinted.strength.unit : ''}`.trim(),
            confidence: 0.94,
          },
          ...others,
        ],
        referenceId: hinted.id,
        simulatedPackText: packPrintedText(hinted, now),
      };
    }

    // No hint: derive something stable from the frame, but stay below threshold.
    const seed = hashImage(input.imageDataUrl ?? 'empty-frame');
    const pack = SAMPLE_PACKS[seed % SAMPLE_PACKS.length];
    const runnerUp = SAMPLE_PACKS[(seed + 3) % SAMPLE_PACKS.length];
    const confidence = Number((0.52 + ((seed >>> 8) % 22) / 100).toFixed(2)); // 0.52 – 0.73

    return {
      medicineName: pack.medicineName,
      strength: pack.strength,
      dosageForm: pack.dosageForm,
      confidence,
      candidates: [
        {
          medicineName: `${pack.medicineName} ${pack.strength ? pack.strength.value + ' ' + pack.strength.unit : ''}`.trim(),
          confidence,
        },
        {
          medicineName: `${runnerUp.medicineName} ${runnerUp.strength ? runnerUp.strength.value + ' ' + runnerUp.strength.unit : ''}`.trim(),
          confidence: Number((confidence - 0.11).toFixed(2)),
        },
      ],
      referenceId: pack.id,
      simulatedPackText: packPrintedText(pack, now),
    };
  }

  async dispose(): Promise<void> {
    this.ready = false;
  }
}
