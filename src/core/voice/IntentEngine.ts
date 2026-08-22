/**
 * INTENT ENGINE — deterministic, offline command understanding.
 *
 * Deliberately NOT a chatbot and NOT a generative model: a fixed set of
 * medication commands, matched by weighted keyword tables per language. It runs
 * in microseconds, works with no network, and behaves identically every time —
 * which is what a safety-relevant medication assistant needs.
 *
 * Adding a language = adding one block to KEYWORDS.
 */

import type { LanguageCode } from '../types';

export type IntentName =
  | 'identify_medicine'
  | 'check_expiry'
  | 'next_medicine'
  | 'today_medicines'
  | 'taken_status'
  | 'open_scan'
  | 'help'
  | 'unknown';

export interface Intent {
  name: IntentName;
  /** 0..1, relative to the strongest competing intent. */
  confidence: number;
  matched: string[];
}

type KeywordTable = Partial<Record<IntentName, string[]>>;

const KEYWORDS: Record<LanguageCode, KeywordTable> = {
  en: {
    identify_medicine: [
      'what medicine',
      'which medicine',
      'what is this',
      'what tablet',
      'identify',
      'what medicine is this',
    ],
    check_expiry: ['expire', 'expired', 'expiry', 'still good', 'out of date'],
    next_medicine: ['next medicine', 'next dose', 'next tablet', 'when is my next', 'when next'],
    today_medicines: ["today's medicines", 'today medicines', 'todays medicine', 'show today', 'schedule today', 'my schedule'],
    taken_status: ['have i taken', 'did i take', 'already taken', 'taken my medicine', 'medicine taken'],
    open_scan: ['scan', 'camera', 'read the pack'],
    help: ['help', 'what can you do', 'what can i ask'],
  },
  ta: {
    identify_medicine: ['என்ன மருந்து', 'இது என்ன', 'எந்த மருந்து', 'மருந்து எது'],
    check_expiry: ['காலாவதி', 'காலாவதியாகி', 'முடிந்துவிட்ட', 'செல்லுபடி'],
    next_medicine: ['அடுத்த மருந்து', 'அடுத்த', 'எப்போது மருந்து'],
    today_medicines: ['இன்றைய மருந்து', 'இன்று மருந்து', 'இன்றைய அட்டவணை', 'அட்டவணை'],
    taken_status: ['எடுத்தேனா', 'சாப்பிட்டேனா', 'மருந்து எடுத்து'],
    open_scan: ['ஸ்கேன்', 'கேமரா', 'படம் எடு'],
    help: ['உதவி', 'என்ன கேட்கலாம்'],
  },
  hi: {
    identify_medicine: ['कौन सी दवा', 'यह क्या', 'कौनसी दवा', 'दवा कौन'],
    check_expiry: ['समाप्त', 'एक्सपायर', 'खराब हो', 'तारीख निकल'],
    next_medicine: ['अगली दवा', 'अगली खुराक', 'कब लेनी', 'अगला'],
    today_medicines: ['आज की दवा', 'आज की दवाइयाँ', 'आज का समय', 'समय-चक्र', 'सूची'],
    taken_status: ['मैंने दवा ली', 'दवा ली है', 'ले ली', 'लिया क्या'],
    open_scan: ['स्कैन', 'कैमरा'],
    help: ['मदद', 'क्या पूछ'],
  },
};

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,?!;:"'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Score every intent by the total length of its matched keywords (longer, more
 * specific phrases outrank single words), then normalise to 0..1.
 */
export function matchIntent(transcript: string, language: LanguageCode): Intent {
  const text = normalise(transcript);
  if (!text) return { name: 'unknown', confidence: 0, matched: [] };

  // Always consider English keywords too: users mix languages ("next medicine எப்போது").
  const tables: KeywordTable[] =
    language === 'en' ? [KEYWORDS.en] : [KEYWORDS[language], KEYWORDS.en];

  const scores = new Map<IntentName, { score: number; matched: string[] }>();

  for (const table of tables) {
    for (const [intent, phrases] of Object.entries(table) as [IntentName, string[]][]) {
      for (const phrase of phrases) {
        if (text.includes(normalise(phrase))) {
          const entry = scores.get(intent) ?? { score: 0, matched: [] };
          entry.score += phrase.length;
          entry.matched.push(phrase);
          scores.set(intent, entry);
        }
      }
    }
  }

  if (scores.size === 0) return { name: 'unknown', confidence: 0, matched: [] };

  let best: IntentName = 'unknown';
  let bestScore = 0;
  let bestMatched: string[] = [];
  let total = 0;
  for (const [intent, entry] of scores) {
    total += entry.score;
    if (entry.score > bestScore) {
      best = intent;
      bestScore = entry.score;
      bestMatched = entry.matched;
    }
  }

  return {
    name: best,
    confidence: Number((bestScore / total).toFixed(2)),
    matched: bestMatched,
  };
}

/** Example prompts shown on the voice screen (translation keys). */
export const EXAMPLE_KEYS = [
  'voice.example_1',
  'voice.example_2',
  'voice.example_3',
  'voice.example_4',
  'voice.example_5',
] as const;
