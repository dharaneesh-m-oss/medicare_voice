import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { useApp } from '../../../app/AppState';
import { useSpeech } from '../../../app/useSpeech';
import type { TranslationKey } from '../../../core/i18n';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Chip } from '../../components/kit';

/**
 * A paced breathing exercise: in for 4, hold for 2, out for 6 — a longer exhale
 * than inhale, which is the part that actually settles people. The orb's CSS
 * transition duration is driven from the phase table, so the animation and the
 * instruction can never drift apart.
 */
interface Phase {
  key: 'inhale' | 'hold' | 'exhale';
  ms: number;
  scale: number;
}

const PHASES: Phase[] = [
  { key: 'inhale', ms: 4000, scale: 1 },
  { key: 'hold', ms: 2000, scale: 1 },
  { key: 'exhale', ms: 6000, scale: 0.62 },
];

const TOTAL_ROUNDS = 5;

export function BreathingScreen() {
  const { t, settings } = useApp();
  const { speak } = useSpeech();

  const [running, setRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [finished, setFinished] = useState(false);
  const timer = useRef<number | null>(null);

  const phase = PHASES[phaseIndex];

  useEffect(() => {
    if (!running) return;

    // Say the instruction once as the phase begins, for users who are not
    // looking at the screen.
    if (settings.voiceEnabled) speak(t(`breathe.${phase.key}` as TranslationKey));

    timer.current = window.setTimeout(() => {
      const nextIndex = (phaseIndex + 1) % PHASES.length;
      if (nextIndex === 0) {
        if (round >= TOTAL_ROUNDS) {
          setRunning(false);
          setFinished(true);
          setPhaseIndex(0);
          return;
        }
        setRound((r) => r + 1);
      }
      setPhaseIndex(nextIndex);
    }, phase.ms);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phaseIndex, round]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const start = () => {
    setFinished(false);
    setRound(1);
    setPhaseIndex(0);
    setRunning(true);
  };

  const stop = () => {
    setRunning(false);
    if (timer.current) window.clearTimeout(timer.current);
  };

  const orbStyle = {
    '--breath-scale': running ? phase.scale : 0.72,
    '--breath-ms': `${running ? phase.ms : 600}ms`,
  } as unknown as CSSProperties;

  return (
    <Screen title={t('breathe.title')}>
      <p className="muted" style={{ margin: 0 }}>
        {t('breathe.subtitle')}
      </p>

      <div className="breathe-stage">
        <div className="breathe-orb" style={orbStyle}>
          {running ? t(`breathe.${phase.key}` as TranslationKey) : t('breathe.title')}
        </div>
      </div>

      {running && (
        <>
          <p className="breathe-phase">{t(`breathe.${phase.key}` as TranslationKey)}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Chip tone="primary">
              {t('breathe.rounds', { current: round, total: TOTAL_ROUNDS })}
            </Chip>
          </div>
        </>
      )}

      {finished && <div className="banner banner-success">{t('breathe.done')}</div>}

      {!running ? (
        <button type="button" className="btn btn-lg btn-primary" onClick={start}>
          <Icon name="play" size={26} />
          {t('breathe.start')}
        </button>
      ) : (
        <button type="button" className="btn btn-lg btn-secondary" onClick={stop}>
          {t('breathe.stop')}
        </button>
      )}

      <p className="footnote">{t('breathe.disclaimer')}</p>
    </Screen>
  );
}
