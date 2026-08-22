/**
 * PLACEHOLDER for the real engine — NOT registered, NOT used by the prototype.
 *
 * This file exists to pin down exactly where the custom model lands and what it
 * has to provide. When the lightweight CV model is trained and converted
 * (TFLite / ONNX -> Qualcomm .dlc via the QNN / SNPE toolchain), implement the
 * three marked steps and register it once at startup:
 *
 *   import { setRecognitionEngine } from './core/recognition';
 *   setRecognitionEngine(new OnDeviceRecognitionEngine({ modelPath: 'medicare_v1.dlc' }));
 *
 * Nothing else in the application changes: the pipeline, verification engine,
 * scheduler, voice assistant and UI all consume the same interface.
 */

import type {
  EngineRecognition,
  MedicineRecognitionEngine,
  RecognitionInput,
} from './MedicineRecognitionEngine';

export interface OnDeviceEngineOptions {
  /** Path/asset id of the converted model. */
  modelPath: string;
  /** cpu | gpu | dsp(NPU). The Snapdragon build should prefer 'dsp'. */
  delegate?: 'cpu' | 'gpu' | 'dsp';
  /** Square input resolution the model was trained at. */
  inputSize?: number;
}

export class OnDeviceRecognitionEngine implements MedicineRecognitionEngine {
  readonly id = 'snapdragon-cv-v1';
  readonly displayName = 'On-device Recognition';
  readonly isSimulated = false;
  readonly confidenceThreshold = 0.8;

  private readonly options: OnDeviceEngineOptions;

  constructor(options: OnDeviceEngineOptions) {
    this.options = options;
  }

  async initialize(): Promise<void> {
    // STEP 1 — load the model and select the runtime delegate.
    //   this.session = await Runtime.load(this.options.modelPath, {
    //     delegate: this.options.delegate ?? 'dsp',
    //   });
    throw new Error(
      `OnDeviceRecognitionEngine is not implemented yet (model: ${this.options.modelPath}). ` +
        'The prototype runs MockRecognitionEngine.',
    );
  }

  async recognize(_input: RecognitionInput): Promise<EngineRecognition> {
    // STEP 2 — decode the frame, letterbox to inputSize, normalise, run inference.
    // STEP 3 — map the arg-max class id to { medicineName, strength, dosageForm }
    //          via the model's label map and return the top-k as `candidates`.
    throw new Error('OnDeviceRecognitionEngine.recognize() not implemented.');
  }

  async dispose(): Promise<void> {
    // Release the interpreter/session and any pinned NPU buffers.
  }
}
