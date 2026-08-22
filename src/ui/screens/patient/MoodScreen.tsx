import { useState } from 'react';

import { useApp } from '../../../app/AppState';
import type { TranslationKey } from '../../../core/i18n';
import { SUPPORT_LINE, type FivePoint } from '../../../core/wellness/types';
import { lowMoodRun, recentMoods, todayMood } from '../../../core/wellness/WellnessService';
import { formatDateLong } from '../../../core/utils/date';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Field } from '../../components/common';
import { Chip, EmptyState, Panel, Toast, useToast } from '../../components/kit';

const FACES = ['😞', '🙁', '😐', '🙂', '😄'];
const LEVELS: FivePoint[] = [1, 2, 3, 4, 5];

function Scale({
  value,
  onChange,
  labelKeyPrefix,
  faces,
  t,
}: {
  value: FivePoint;
  onChange: (next: FivePoint) => void;
  labelKeyPrefix: 'mood.scale' | 'mood.stress';
  faces?: boolean;
  t: (key: TranslationKey) => string;
}) {
  return (
    <div className="scale">
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          aria-pressed={level === value}
          onClick={() => onChange(level)}
        >
          {faces ? (
            <span className="face" aria-hidden="true">
              {FACES[level - 1]}
            </span>
          ) : (
            <span className="face" aria-hidden="true">
              {level}
            </span>
          )}
          {t(`${labelKeyPrefix}_${level}` as TranslationKey)}
        </button>
      ))}
    </div>
  );
}

export function MoodScreen() {
  const { t, locale, moods, logMood } = useApp();
  const [toast, showToast] = useToast();

  const existing = todayMood(moods);
  const [mood, setMood] = useState<FivePoint>(existing?.mood ?? 3);
  const [stress, setStress] = useState<FivePoint>(existing?.stress ?? 3);
  const [sleepQuality, setSleepQuality] = useState<FivePoint>(existing?.sleepQuality ?? 3);
  const [note, setNote] = useState(existing?.note ?? '');

  const recent = recentMoods(moods, 7);
  const run = lowMoodRun(recent);

  const save = () => {
    logMood({ mood, stress, sleepQuality, note });
    showToast(t('mood.saved'));
  };

  return (
    <Screen title={t('mood.title')}>
      <div className="card">
        <h2>{t('mood.question')}</h2>

        <div className="field">
          <span className="field-label">{t('mood.mood')}</span>
          <Scale value={mood} onChange={setMood} labelKeyPrefix="mood.scale" faces t={t} />
        </div>

        <div className="field">
          <span className="field-label">{t('mood.stress')}</span>
          <Scale value={stress} onChange={setStress} labelKeyPrefix="mood.stress" t={t} />
        </div>

        <div className="field">
          <span className="field-label">{t('mood.sleep_quality')}</span>
          <Scale
            value={sleepQuality}
            onChange={setSleepQuality}
            labelKeyPrefix="mood.scale"
            t={t}
          />
        </div>

        <Field label={t('mood.note')}>
          <textarea
            className="textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('mood.note_placeholder')}
          />
        </Field>

        <button type="button" className="btn btn-lg btn-primary" onClick={save}>
          <Icon name="check" size={26} />
          {t('mood.save')}
        </button>
      </div>

      {run >= 3 && (
        <div className="card card-accent-warn">
          <div className="row">
            <span className="big-value">{t('mood.support_title')}</span>
            <Icon name="heart" size={30} />
          </div>
          <p style={{ margin: 0 }}>{t('mood.support_body')}</p>
          <a
            className="btn btn-secondary"
            href={`tel:${SUPPORT_LINE.number}`}
            style={{ textDecoration: 'none' }}
          >
            <Icon name="phone" size={24} />
            {t('mood.support_call', { name: SUPPORT_LINE.name, number: SUPPORT_LINE.number })}
          </a>
          <p className="footnote">{t('safety.ask_doctor')}</p>
        </div>
      )}

      <Panel title={t('mood.history')} flush>
        {recent.length === 0 && <EmptyState message={t('mood.no_entries')} />}
        {[...recent].reverse().map((entry) => (
          <div className="row-item" key={entry.id}>
            <span className="face" style={{ fontSize: '1.6em' }} aria-hidden="true">
              {FACES[entry.mood - 1]}
            </span>
            <span className="row-main">
              <span className="row-title">{t(`mood.scale_${entry.mood}` as TranslationKey)}</span>
              <span className="row-sub">{formatDateLong(entry.date, locale)}</span>
              {entry.note && <span className="row-sub">{entry.note}</span>}
            </span>
            <span className="row-side">
              <Chip tone={entry.stress >= 4 ? 'warn' : 'default'}>
                {t('mood.stress')} {entry.stress}/5
              </Chip>
            </span>
          </div>
        ))}
      </Panel>

      <p className="footnote">{t('mood.disclaimer')}</p>
      <Toast message={toast} />
    </Screen>
  );
}
