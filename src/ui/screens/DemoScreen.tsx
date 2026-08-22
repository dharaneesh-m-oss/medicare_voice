import { useState } from 'react';

import { useApp } from '../../app/AppState';
import { useNavigator } from '../../app/Navigator';
import { useReminders } from '../../app/Reminders';
import type { TranslationKey } from '../../core/i18n';
import { buildDayView } from '../../core/scheduler/MedicationScheduler';
import { toISODate } from '../../core/utils/date';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { SafetyNote, StatusBadge, type Tone } from '../components/common';

interface Scenario {
  id: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  packId?: string;
  expectKey: TranslationKey;
  tone: Tone;
}

const SCENARIOS: Scenario[] = [
  {
    id: 's1',
    titleKey: 'demo.s1_title',
    descKey: 'demo.s1_desc',
    packId: 'metformin-500',
    expectKey: 'result.verdict_safe',
    tone: 'success',
  },
  {
    id: 's2',
    titleKey: 'demo.s2_title',
    descKey: 'demo.s2_desc',
    packId: 'paracetamol-500',
    expectKey: 'result.status_expired',
    tone: 'danger',
  },
  {
    id: 's3',
    titleKey: 'demo.s3_title',
    descKey: 'demo.s3_desc',
    packId: 'atorvastatin-10',
    expectKey: 'result.verdict_unsafe',
    tone: 'danger',
  },
  {
    id: 's4',
    titleKey: 'demo.s4_title',
    descKey: 'demo.s4_desc',
    packId: 'metformin-1000',
    expectKey: 'result.verdict_unsafe',
    tone: 'danger',
  },
  {
    id: 's5',
    titleKey: 'demo.s5_title',
    descKey: 'demo.s5_desc',
    expectKey: 'reminder.title',
    tone: 'warn',
  },
];

export function DemoScreen() {
  const { t, schedules, records, resetDemoData } = useApp();
  const { navigate } = useNavigator();
  const { forceReminder } = useReminders();
  const [note, setNote] = useState<string | null>(null);

  const runMissedReminder = () => {
    const now = new Date();
    const views = buildDayView(schedules, records, toISODate(now), now);
    const past = views.filter((view) => view.timestamp <= now.getTime() && !view.record);
    const target = past.length > 0 ? past[past.length - 1] : (views[0] ?? null);
    if (!target) {
      setNote(t('demo.s5_none'));
      return;
    }
    setNote(null);
    forceReminder(target);
  };

  const run = (scenario: Scenario) => {
    if (scenario.packId) {
      navigate('scan', { autoSamplePackId: scenario.packId });
      return;
    }
    runMissedReminder();
  };

  return (
    <Screen title={t('demo.title')}>
      <div className="banner">
        <Icon name="alert" size={22} />
        <span>{t('demo.intro')}</span>
      </div>

      {note && <div className="banner banner-warn">{note}</div>}

      {SCENARIOS.map((scenario, index) => (
        <div className="card card-tight" key={scenario.id}>
          <div className="row">
            <span className="big-value">
              {index + 1}. {t(scenario.titleKey)}
            </span>
            <StatusBadge tone={scenario.tone}>{t(scenario.expectKey)}</StatusBadge>
          </div>
          <span className="muted">{t(scenario.descKey)}</span>
          <button type="button" className="btn btn-primary" onClick={() => run(scenario)}>
            <Icon name="play" size={24} />
            {t('demo.run')}
          </button>
        </div>
      ))}

      <button type="button" className="btn btn-secondary" onClick={resetDemoData}>
        {t('demo.reset')}
      </button>

      <SafetyNote />
    </Screen>
  );
}
