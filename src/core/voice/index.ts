/** Voice engine registry — swap point for on-device multilingual speech. */

import type { SpeechEngine } from './SpeechEngine';
import { WebSpeechEngine } from './WebSpeechEngine';

let current: SpeechEngine = new WebSpeechEngine();

export function getSpeechEngine(): SpeechEngine {
  return current;
}

export function setSpeechEngine(engine: SpeechEngine): void {
  current.cancelSpeech();
  current.stopListening();
  current = engine;
}

export type { SpeechEngine, ListenOptions, SpeakOptions } from './SpeechEngine';
export { WebSpeechEngine } from './WebSpeechEngine';
export { matchIntent, EXAMPLE_KEYS } from './IntentEngine';
export type { Intent, IntentName } from './IntentEngine';
export { ask, answerIntent } from './AssistantService';
export type { AssistantContext, AssistantReply, AssistantAction } from './AssistantService';
