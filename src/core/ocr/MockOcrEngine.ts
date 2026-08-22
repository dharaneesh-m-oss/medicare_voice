/**
 * DEMO OCR ENGINE.
 *
 * The pixel-to-text step is simulated: the text comes from the sample pack table
 * instead of the camera frame. Everything after that — the field extraction in
 * `parsePackFields()` — is the real implementation and will be reused unchanged
 * once on-device OCR is wired in.
 */

import type { OcrLine } from '../types';
import type { EngineOcr, OcrEngine, OcrInput } from './OcrEngine';
import { parsePackFields } from './OcrEngine';

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export class MockOcrEngine implements OcrEngine {
  readonly id = 'mock-ocr-v1';
  readonly displayName = 'Demo Text Reader';
  readonly isSimulated = true;

  private ready = false;

  async initialize(): Promise<void> {
    if (this.ready) return;
    await delay(60);
    this.ready = true;
  }

  async readText(input: OcrInput): Promise<EngineOcr> {
    if (!this.ready) await this.initialize();
    await delay(350);

    const raw = input.simulatedPackText ?? [];
    // Per-line confidence wobbles the way real OCR output does: small print
    // (batch/expiry lines) reads slightly worse than the brand name.
    const lines: OcrLine[] = raw.map((text, i) => ({
      text,
      confidence: Number(Math.max(0.72, 0.97 - i * 0.03).toFixed(2)),
    }));

    return {
      lines,
      fullText: raw.join('\n'),
      fields: parsePackFields(raw),
    };
  }

  async dispose(): Promise<void> {
    this.ready = false;
  }
}
