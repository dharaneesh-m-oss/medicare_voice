import { useState } from 'react';

import { useApp } from '../../app/AppState';
import { useNavigator } from '../../app/Navigator';
import { useSpeech } from '../../app/useSpeech';
import type { TranslationKey } from '../../core/i18n';
import { EXAMPLE_KEYS, ask, type AssistantAction } from '../../core/voice';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { SafetyNote } from '../components/common';

interface Turn {
  question: string;
  answer: string;
  action?: AssistantAction;
}

export function VoiceScreen() {
  const { t, settings, schedules, records, lastScan } = useApp();
  const { navigate } = useNavigator();
  const { speak, startListening, stopListening, listening, recognitionSupported } = useSpeech();

  const [partial, setPartial] = useState('');
  const [typed, setTyped] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleQuestion = (question: string) => {
    const text = question.trim();
    if (!text) return;
    setPartial('');
    setError(null);

    const reply = ask(text, {
      language: settings.language,
      t,
      lastScan,
      schedules,
      records,
    });

    setTurns((prev) => [{ question: text, answer: reply.text, action: reply.action }, ...prev].slice(0, 6));
    speak(reply.text);

    if (reply.intent === 'open_scan') {
      window.setTimeout(() => navigate('scan'), 900);
    }
  };

  const toggleMic = () => {
    if (listening) {
      stopListening();
      return;
    }
    setPartial('');
    startListening({
      onPartial: setPartial,
      onResult: handleQuestion,
      onError: (code) =>
        setError(code === 'not-allowed' ? t('voice.mic_denied') : t('voice.unsupported')),
    });
  };

  const followUp = (action: AssistantAction | undefined) => {
    if (action === 'open_schedule') navigate('schedule');
    if (action === 'open_result') navigate('result');
    if (action === 'open_scan') navigate('scan');
  };

  return (
    <Screen title={t('voice.title')}>
      <button
        type="button"
        className="mic-button"
        data-listening={listening}
        onClick={toggleMic}
        aria-label={listening ? t('common.stop') : t('voice.tap_to_speak')}
      >
        <Icon name="mic" size={56} strokeWidth={1.8} />
        {listening ? t('voice.listening') : t('voice.tap_to_speak')}
      </button>

      {partial && (
        <div className="bubble bubble-user">
          <span className="detail-label">{t('voice.you_said')}</span>
          <div>{partial}</div>
        </div>
      )}

      {!recognitionSupported && <div className="banner banner-warn">{t('voice.unsupported')}</div>}
      {error && <div className="banner banner-warn">{error}</div>}

      <div className="field">
        <span className="field-label">{t('voice.type_instead')}</span>
        <div className="inline-fields">
          <input
            className="input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleQuestion(typed);
                setTyped('');
              }
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ maxWidth: 120 }}
            onClick={() => {
              handleQuestion(typed);
              setTyped('');
            }}
          >
            {t('voice.send')}
          </button>
        </div>
      </div>

      {turns.length > 0 && (
        <div className="conversation">
          {turns.map((turn, index) => (
            <div className="stack-sm" key={`${turn.question}-${index}`}>
              <div className="bubble bubble-user">{turn.question}</div>
              <div className="bubble bubble-app">{turn.answer}</div>
              {turn.action && index === 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: 52 }}
                  onClick={() => followUp(turn.action)}
                >
                  {turn.action === 'open_schedule'
                    ? t('home.schedule')
                    : turn.action === 'open_result'
                      ? t('result.title')
                      : t('home.scan')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="stack">
        <h2 className="section-title">{t('voice.examples')}</h2>
        {EXAMPLE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className="btn btn-ghost"
            style={{ justifyContent: 'flex-start', minHeight: 56 }}
            onClick={() => handleQuestion(t(key as TranslationKey))}
          >
            {t(key as TranslationKey)}
          </button>
        ))}
      </div>

      <SafetyNote />
    </Screen>
  );
}
