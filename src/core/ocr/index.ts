/** OCR engine registry — swap point for on-device text recognition. */

import type { OcrEngine } from './OcrEngine';
import { MockOcrEngine } from './MockOcrEngine';

let current: OcrEngine = new MockOcrEngine();

export function getOcrEngine(): OcrEngine {
  return current;
}

export function setOcrEngine(engine: OcrEngine): void {
  void current.dispose();
  current = engine;
}

export type { OcrEngine, OcrInput, EngineOcr } from './OcrEngine';
export { parsePackFields, normaliseExpiry } from './OcrEngine';
export { MockOcrEngine } from './MockOcrEngine';
