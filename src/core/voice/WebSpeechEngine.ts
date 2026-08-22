/**
 * Web Speech API implementation of SpeechEngine.
 *
 * Chrome on Android (and the iQOO's default browser/WebView with Google services)
 * supports both recognition and synthesis for en-IN / hi-IN; Tamil recognition
 * availability varies by device, which is why every voice screen also accepts
 * typed input.
 */

import type { ListenOptions, SpeakOptions, SpeechEngine } from './SpeechEngine';

/* Minimal structural types — the DOM lib does not ship these everywhere. */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export class WebSpeechEngine implements SpeechEngine {
  readonly id = 'web-speech-v1';
  readonly displayName = 'Browser Speech (prototype)';

  private recognition: SpeechRecognitionLike | null = null;
  private listening = false;

  isRecognitionSupported(): boolean {
    return getRecognitionCtor() !== null;
  }

  isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  startListening(options: ListenOptions): void {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      options.onError?.('unsupported');
      options.onEnd?.();
      return;
    }
    this.stopListening();

    const recognition = new Ctor();
    recognition.lang = options.locale;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) finalText += text;
        else interim += text;
      }
      if (interim) options.onPartial?.(interim);
      if (finalText) options.onPartial?.(finalText);
    };

    recognition.onerror = (event) => {
      options.onError?.(event.error || 'error');
    };

    recognition.onend = () => {
      this.listening = false;
      this.recognition = null;
      const text = finalText.trim();
      if (text) options.onResult(text);
      options.onEnd?.();
    };

    this.recognition = recognition;
    this.listening = true;
    try {
      recognition.start();
    } catch {
      this.listening = false;
      options.onError?.('start_failed');
      options.onEnd?.();
    }
  }

  stopListening(): void {
    if (this.recognition && this.listening) {
      try {
        this.recognition.stop();
      } catch {
        /* already stopped */
      }
    }
    this.listening = false;
  }

  speak(text: string, options: SpeakOptions): void {
    if (!this.isSynthesisSupported() || !text) {
      options.onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.locale;
    // Slower than default: clearer for elderly listeners.
    utterance.rate = options.rate ?? 0.92;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const exact = voices.find((v) => v.lang === options.locale);
    const sameLanguage = voices.find(
      (v) => v.lang.split('-')[0] === options.locale.split('-')[0],
    );
    const voice = exact ?? sameLanguage;
    if (voice) utterance.voice = voice;

    utterance.onstart = () => options.onStart?.();
    utterance.onend = () => options.onEnd?.();
    utterance.onerror = () => options.onEnd?.();

    window.speechSynthesis.speak(utterance);
  }

  cancelSpeech(): void {
    if (this.isSynthesisSupported()) window.speechSynthesis.cancel();
  }
}
