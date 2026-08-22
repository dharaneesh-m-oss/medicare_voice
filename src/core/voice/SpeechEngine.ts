/**
 * VOICE INTERFACE — third swap point.
 *
 * The prototype uses the browser Web Speech API. A production Android build
 * replaces this with an on-device multilingual ASR/TTS pair (e.g. Whisper-small
 * or a Qualcomm-optimised streaming model) implementing the same interface.
 */

export interface ListenOptions {
  /** BCP-47, e.g. "ta-IN". */
  locale: string;
  onPartial?: (text: string) => void;
  onResult: (text: string) => void;
  onError?: (code: string) => void;
  onEnd?: () => void;
}

export interface SpeakOptions {
  locale: string;
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export interface SpeechEngine {
  readonly id: string;
  readonly displayName: string;
  isRecognitionSupported(): boolean;
  isSynthesisSupported(): boolean;
  startListening(options: ListenOptions): void;
  stopListening(): void;
  speak(text: string, options: SpeakOptions): void;
  cancelSpeech(): void;
}
