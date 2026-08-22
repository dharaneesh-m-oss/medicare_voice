/**
 * React binding for the voice engine. Components never talk to
 * speechSynthesis / SpeechRecognition directly — they use this hook, so the
 * engine can be swapped without touching a single screen.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { getSpeechEngine } from '../core/voice';
import { useApp } from './AppState';

export interface ListenHandlers {
  onPartial?: (text: string) => void;
  onResult: (text: string) => void;
  onError?: (code: string) => void;
}

export function useSpeech() {
  const { settings, locale } = useApp();
  const engine = getSpeechEngine();
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      engine.cancelSpeech();
      engine.stopListening();
    };
  }, [engine]);

  const speak = useCallback(
    (text: string) => {
      if (!settings.voiceEnabled || !text) return;
      engine.speak(text, {
        locale,
        onStart: () => mounted.current && setSpeaking(true),
        onEnd: () => mounted.current && setSpeaking(false),
      });
    },
    [engine, locale, settings.voiceEnabled],
  );

  const stopSpeaking = useCallback(() => {
    engine.cancelSpeech();
    setSpeaking(false);
  }, [engine]);

  const startListening = useCallback(
    (handlers: ListenHandlers) => {
      engine.cancelSpeech();
      setListening(true);
      engine.startListening({
        locale,
        onPartial: handlers.onPartial,
        onResult: handlers.onResult,
        onError: handlers.onError,
        onEnd: () => mounted.current && setListening(false),
      });
    },
    [engine, locale],
  );

  const stopListening = useCallback(() => {
    engine.stopListening();
    setListening(false);
  }, [engine]);

  return {
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    speaking,
    listening,
    recognitionSupported: engine.isRecognitionSupported(),
    synthesisSupported: engine.isSynthesisSupported(),
    engineName: engine.displayName,
  };
}
