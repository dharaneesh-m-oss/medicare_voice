import { useMemo, useState } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import {
  activitySeries,
  average,
  goalStreak,
  todayLog,
} from '../../../core/wellness/WellnessService';
import { fromISODate } from '../../../core/utils/date';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Field, SafetyNote } from '../../components/common';
import { BarChart, Chip, Meter, Panel, Ring, Toast, useToast } from '../../components/kit';

export function WellnessScreen() {
  const { t, locale, activity, goal, logActivity, updateGoal } = useApp();
  const { navigate } = useNavigator();
  const [toast, showToast] = useToast();
  const [editingGoals, setEditingGoals] = useState(false);

  const today = todayLog(activity) ?? {
    steps: 0,
    sleepHours: 0,
    waterGlasses: 0,
    activeMinutes: 0,
  };

  const [steps, setSteps] = useState(String(today.steps || ''));
  const [sleep, setSleep] = useState(String(today.sleepHours || ''));
  const [water, setWater] = useState(today.waterGlasses);
  const [active, setActive] = useState(String(today.activeMinutes || ''));

  const stepSeries = useMemo(() => {
    const points = activitySeries(activity, 'steps', 7);
    return points.map((p) => ({
      label: fromISODate(p.date).toLocaleDateString(locale, { weekday: 'short' }),
      value: p.value,
    }));
  }, [activity, locale]);

  const sleepSeries = useMemo(() => {
    const points = activitySeries(activity, 'sleepHours', 7);
    return points.map((p) => ({
      label: fromISODate(p.date).toLocaleDateString(locale, { weekday: 'short' }),
      value: p.value,
    }));
  }, [activity, locale]);

  const avgSteps = Math.round(average(activitySeries(activity, 'steps', 7)));
  const avgSleep = average(activitySeries(activity, 'sleepHours', 7));
  const streak = goalStreak(activity, goal);

  const save = () => {
    logActivity({
      steps: Number(steps) || 0,
      sleepHours: Number(sleep) || 0,
      waterGlasses: water,
      activeMinutes: Number(active) || 0,
    });
    showToast(t('wellness.saved'));
  };

  return (
    <Screen title={t('wellness.title')}>
      <div className="card">
        <div className="row">
          <Ring
            value={Number(steps) || 0}
            max={goal.stepsPerDay}
            label={t('wellness.goal', { value: goal.stepsPerDay })}
          />
          {streak > 0 && <Chip tone="success">{t('wellness.streak_days', { count: streak })}</Chip>}
        </div>

        <div className="inline-fields">
          <Field label={t('wellness.steps')}>
            <input
              className="input"
              inputMode="numeric"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
            />
          </Field>
          <Field label={t('wellness.sleep')}>
            <input
              className="input"
              inputMode="decimal"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
            />
          </Field>
          <Field label={t('wellness.active_minutes')}>
            <input
              className="input"
              inputMode="numeric"
              value={active}
              onChange={(e) => setActive(e.target.value)}
            />
          </Field>
        </div>

        <div className="field">
          <span className="field-label">
            {t('wellness.water')} · {t('wellness.glasses', { value: water })}
          </span>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setWater((v) => Math.max(0, v - 1))}
              aria-label="-1"
            >
              −
            </button>
            <Meter value={water} max={goal.waterGlassesPerDay} tone="primary" />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setWater((v) => v + 1)}
              aria-label="+1"
            >
              +
            </button>
          </div>
        </div>

        <button type="button" className="btn btn-lg btn-primary" onClick={save}>
          <Icon name="check" size={26} />
          {t('wellness.log')}
        </button>
      </div>

      <Panel
        title={`${t('wellness.steps')} · ${t('wellness.week')}`}
        action={<Chip>{t('wellness.average', { value: avgSteps })}</Chip>}
      >
        <BarChart points={stepSeries} goal={goal.stepsPerDay} />
      </Panel>

      <Panel
        title={`${t('wellness.sleep')} · ${t('wellness.week')}`}
        action={<Chip>{t('wellness.average', { value: avgSleep.toFixed(1) })}</Chip>}
      >
        <BarChart points={sleepSeries} goal={goal.sleepHoursPerNight} height={80} />
      </Panel>

      <button type="button" className="btn btn-secondary" onClick={() => navigate('mood')}>
        <Icon name="smile" size={26} />
        {t('wellness.check_in')}
      </button>

      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => setEditingGoals((v) => !v)}
      >
        {t('wellness.set_goals')}
      </button>

      {editingGoals && (
        <div className="card">
          <div className="inline-fields">
            <Field label={t('wellness.steps')}>
              <input
                className="input"
                inputMode="numeric"
                value={goal.stepsPerDay}
                onChange={(e) => updateGoal({ stepsPerDay: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label={t('wellness.sleep')}>
              <input
                className="input"
                inputMode="decimal"
                value={goal.sleepHoursPerNight}
                onChange={(e) => updateGoal({ sleepHoursPerNight: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label={t('wellness.water')}>
              <input
                className="input"
                inputMode="numeric"
                value={goal.waterGlassesPerDay}
                onChange={(e) => updateGoal({ waterGlassesPerDay: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>
        </div>
      )}

      <SafetyNote />
      <Toast message={toast} />
    </Screen>
  );
}
