/**
 * Recognition engine registry — the single swap point for the custom AI model.
 */

import type { MedicineRecognitionEngine } from './MedicineRecognitionEngine';
import { MockRecognitionEngine } from './MockRecognitionEngine';

let current: MedicineRecognitionEngine = new MockRecognitionEngine();

export function getRecognitionEngine(): MedicineRecognitionEngine {
  return current;
}

/**
 * Replace the active engine. Call once at startup, e.g.
 *   setRecognitionEngine(new OnDeviceRecognitionEngine({ modelPath: '...' }))
 */
export function setRecognitionEngine(engine: MedicineRecognitionEngine): void {
  void current.dispose();
  current = engine;
}

export type {
  MedicineRecognitionEngine,
  RecognitionInput,
  EngineRecognition,
} from './MedicineRecognitionEngine';
export { MockRecognitionEngine } from './MockRecognitionEngine';
export { OnDeviceRecognitionEngine } from './OnDeviceRecognitionEngine';
export * from './medicineDatabase';
