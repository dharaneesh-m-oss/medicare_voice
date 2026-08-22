import { useMemo, useState } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator, type ScreenName } from '../../../app/Navigator';
import { nextCheckup } from '../../../core/clinic/AppointmentService';
import type { TranslationKey } from '../../../core/i18n';
import { getInsightsEngine } from '../../../core/insights/InsightsEngine';
import { buildDayView, getNextDose, summariseDay } from '../../../core/scheduler/MedicationScheduler';
import { formatStrength } from '../../../core/types';
import { formatDateLong, formatTime12h, fromISODate, toISODate } from '../../../core/utils/date';
import type { FivePoint } from '../../../core/wellness/types';
import {
  activitySeries,
  goalStreak,
  todayLog,
  todayMood,
} from '../../../core/wellness/WellnessService';
import { Icon, type IconName } from '../../components/Icon';
import { SafetyNote, SpeakButton } from '../../components/common';
import {
  ActivityRings,
  Chip,
  InsightCard,
  MetricCard,
  Panel,
  Toast,
  WeekStrip,
  useToast,
  type RingSpec,
} from '../../components/kit';

const FACES = ['😞', '🙁', '😐', '🙂', '😄'];
const LEVELS: FivePoint[] = [1, 2, 3, 4, 5];

/** Each pillar's hue, matching the CSS custom properties. */
const HUE: Record<string, { colour: string; soft: string; icon: IconName }> = {
  movement: { colour: 'var(--move)', soft: 'var(--move-soft)', icon: 'steps' },
  sleep: { colour: 'var(--sleep)', soft: 'var(--sleep-soft)', icon: 'moon' },
  hydration: { colour: 'var(--water)', soft: 'var(--water-soft)', icon: 'droplet' },
  mood: { colour: 'var(--mood)', soft: 'var(--mood-soft)', icon: 'smile' },
  medication: { colour: 'var(--meds)', soft: 'var(--meds-soft)', icon: 'pills' },
};

export function WellbeingHomeScreen() {
  const {
    t,
    locale,
    db,
    patient,
    schedules,
    records,
    appointments,
    activity,
    moods,
    goal,
    insights,
    wellbeing,
    logMood,
  } = useApp();
  const { navigate } = useNavigator();
  const [toast, showToast] = useToast();
  const [showPillars, setShowPillars] = useState(false);

  const now = new Date();
  const today = todayLog(activity);
  const mood = todayMood(moods);
  const streak = goalStreak(activity, goal);

  const { next, summary } = useMemo(() => {
    const views = buildDayView(schedules, records, toISODate(now), now);
    return { next: getNextDose(schedules, records, now), summary: summariseDay(views) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedules, records]);

  const checkup = useMemo(
    () => nextCheckup(appointments, patient?.id ?? null, new Date()),
    [appointments, patient?.id],
  );
  const checkupDoctor = db.doctors.find((d) => d.id === checkup?.doctorId) ?? null;

  const steps = today?.steps ?? 0;
  const sleep = today?.sleepHours ?? 0;
  const water = today?.waterGlasses ?? 0;

  /* The three arcs: today against today's goals. */
  const rings: RingSpec[] = [
    { value: steps / goal.stepsPerDay, colour: 'var(--move)', label: t('pillar.movement') },
    { value: sleep / goal.sleepHoursPerNight, colour: 'var(--sleep)', label: t('pillar.sleep') },
    { value: water / goal.waterGlassesPerDay, colour: 'var(--water)', label: t('pillar.hydration') },
  ];

  const week = useMemo(
    () =>
      activitySeries(activity, 'steps', 7).map((point) => ({
        label: fromISODate(point.date)
          .toLocaleDateString(locale, { weekday: 'short' })
          .slice(0, 2),
        value: point.value,
        isToday: point.date === toISODate(now),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activity, locale],
  );

  const greetingKey =
    now.getHours() < 12
      ? 'home.greeting_morning'
      : now.getHours() < 17
        ? 'home.greeting_afternoon'
        : 'home.greeting_evening';

  const bandLabel = t(`wellbeing.band_${wellbeing.band}` as TranslationKey);

  const trendLabel =
    wellbeing.trend === null
      ? null
      : wellbeing.trend > 0
        ? t('wellbeing.trend_up', { value: wellbeing.trend })
        : wellbeing.trend < 0
          ? t('wellbeing.trend_down', { value: Math.abs(wellbeing.trend) })
          : t('wellbeing.trend_flat');

  const spoken = [
    t(greetingKey),
    wellbeing.score !== null
      ? `${t('wellbeing.score')}: ${wellbeing.score} / 100. ${bandLabel}.`
      : t('wellbeing.no_data'),
    next
      ? `${t('home.next_dose')}: ${next.medicineName} ${formatStrength(next.strength)}, ${formatTime12h(next.time)}.`
      : '',
  ].join(' ');

  const topInsights = insights.slice(0, 4);

  return (
    <div className="page">
      {/* Large title that scrolls away under the blurred nav bar. */}
      <div className="row">
        <div style={{ minWidth: 0 }}>
          <h1 className="large-title">{t('wellbeing.title')}</h1>
          <div className="large-title-sub">
            {t(greetingKey)}, {patient?.fullName.split(' ')[0] ?? ''} ·{' '}
            {formatDateLong(toISODate(now), locale)}
          </div>
        </div>
        <SpeakButton text={spoken} compact />
      </div>

      {/* ---------- rings ---------- */}
      <div className="rings-hero">
        <div className="rings-main">
          <ActivityRings
            rings={rings}
            centre={
              <>
                <div className="rings-score">{wellbeing.score ?? '—'}</div>
                <div className="rings-outof">/ 100</div>
              </>
            }
          />
          <div className="rings-copy">
            <span className="rings-band">
              {wellbeing.score === null ? t('wellbeing.no_data') : bandLabel}
            </span>
            {trendLabel && (
              <span className="rings-trend">
                <Icon name="activity" size={15} />
                {trendLabel}
              </span>
            )}
            <span className="rings-sub">
              {t('wellbeing.days_logged', { count: wellbeing.daysLogged })}
              {streak > 0 ? ` · ${t('wellness.streak_days', { count: streak })}` : ''}
            </span>
          </div>
        </div>

        <div className="rings-legend">
          <div className="legend-item">
            <span className="legend-key">
              <span className="legend-swatch" style={{ background: 'var(--move)' }} />
              {t('pillar.movement')}
            </span>
            <span className="legend-value">{steps.toLocaleString(locale)}</span>
            <span className="legend-goal">/ {goal.stepsPerDay.toLocaleString(locale)}</span>
          </div>
          <div className="legend-item">
            <span className="legend-key">
              <span className="legend-swatch" style={{ background: 'var(--sleep)' }} />
              {t('pillar.sleep')}
            </span>
            <span className="legend-value">{sleep}</span>
            <span className="legend-goal">/ {goal.sleepHoursPerNight} h</span>
          </div>
          <div className="legend-item">
            <span className="legend-key">
              <span className="legend-swatch" style={{ background: 'var(--water)' }} />
              {t('pillar.hydration')}
            </span>
            <span className="legend-value">{water}</span>
            <span className="legend-goal">/ {goal.waterGlassesPerDay}</span>
          </div>
        </div>
      </div>

      {/* ---------- today's numbers ---------- */}
      <div className="quick-grid">
        <MetricCard
          icon={HUE.movement.icon}
          label={t('wellness.steps')}
          value={steps.toLocaleString(locale)}
          progress={steps / goal.stepsPerDay}
          goalLabel={t('wellness.goal', { value: goal.stepsPerDay.toLocaleString(locale) })}
          colour={HUE.movement.colour}
          softColour={HUE.movement.soft}
        />
        <MetricCard
          icon={HUE.sleep.icon}
          label={t('wellness.sleep')}
          value={sleep}
          unit="h"
          progress={sleep / goal.sleepHoursPerNight}
          goalLabel={t('wellness.goal', { value: `${goal.sleepHoursPerNight} h` })}
          colour={HUE.sleep.colour}
          softColour={HUE.sleep.soft}
        />
        <MetricCard
          icon={HUE.hydration.icon}
          label={t('wellness.water')}
          value={water}
          progress={water / goal.waterGlassesPerDay}
          goalLabel={t('wellness.goal', { value: goal.waterGlassesPerDay })}
          colour={HUE.hydration.colour}
          softColour={HUE.hydration.soft}
        />
        <MetricCard
          icon={HUE.medication.icon}
          label={t('nav.medicines')}
          value={`${summary.taken}/${summary.total}`}
          progress={summary.total > 0 ? summary.taken / summary.total : 0}
          goalLabel={t('home.doses_today', { taken: summary.taken, total: summary.total })}
          colour={HUE.medication.colour}
          softColour={HUE.medication.soft}
        />
      </div>

      <button type="button" className="btn btn-secondary" onClick={() => navigate('wellness')}>
        <Icon name="edit" size={24} />
        {t('wellbeing.quick_log')}
      </button>

      {/* ---------- the week ---------- */}
      <Panel
        title={`${t('wellness.steps')} · ${t('wellness.week')}`}
        action={<Chip tone="primary">{t('wellness.streak_days', { count: streak })}</Chip>}
      >
        <WeekStrip days={week} colour="var(--move)" max={goal.stepsPerDay} />
      </Panel>

      {/* ---------- mood ---------- */}
      <Panel title={t('wellbeing.how_today')}>
        <div className="mood-strip">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={mood?.mood === level}
              aria-label={t(`mood.scale_${level}` as TranslationKey)}
              onClick={() => {
                logMood({
                  mood: level,
                  stress: mood?.stress ?? 3,
                  sleepQuality: mood?.sleepQuality ?? 3,
                  note: mood?.note ?? '',
                });
                showToast(t('wellbeing.mood_saved'));
              }}
            >
              <span className="face" aria-hidden="true">
                {FACES[level - 1]}
              </span>
              {t(`mood.scale_${level}` as TranslationKey)}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('mood')}>
          {t('mood.title')}
        </button>
      </Panel>

      {/* ---------- calm ---------- */}
      <button type="button" className="tile tile-primary" onClick={() => navigate('breathe')}>
        <span className="tile-icon">
          <Icon name="heart" size={32} />
        </span>
        <span className="tile-text">
          <span className="tile-label">{t('wellbeing.breathe')}</span>
          <span className="tile-sub">{t('wellbeing.breathe_sub')}</span>
        </span>
      </button>

      {/* ---------- insights ---------- */}
      <Panel
        title={t('insight.title')}
        action={<Chip tone="violet">{getInsightsEngine().displayName}</Chip>}
      >
        {topInsights.length === 0 && <p className="muted">{t('insight.none')}</p>}
        {topInsights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onAction={(screen) => navigate(screen as ScreenName)}
          />
        ))}
        <p className="footnote">
          {t('insight.engine_note', { engine: getInsightsEngine().displayName })}
        </p>
      </Panel>

      {/* ---------- score breakdown ---------- */}
      <Panel
        title={t('wellbeing.pillars')}
        action={
          <button
            type="button"
            className="link-button"
            onClick={() => setShowPillars((v) => !v)}
          >
            {showPillars ? t('common.close') : t('common.view')}
          </button>
        }
      >
        {showPillars && (
          <div className="pillars">
            {wellbeing.pillars.map((pillar) => (
              <div
                className={pillar.hasData ? 'pillar' : 'pillar pillar-empty'}
                key={pillar.key}
              >
                <span className="pillar-name">
                  <Icon name={HUE[pillar.key].icon} size={16} />{' '}
                  {t(`pillar.${pillar.key}` as TranslationKey)}
                </span>
                <span className="pillar-track">
                  <span
                    className="pillar-fill"
                    style={{
                      width: `${pillar.hasData ? pillar.value : 0}%`,
                      background: HUE[pillar.key].colour,
                    }}
                  />
                </span>
                <span className="pillar-value">
                  {pillar.hasData ? `${pillar.value}%` : t('wellbeing.no_pillar_data')}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="footnote">{t('wellbeing.score_hint')}</p>
      </Panel>

      {/* ---------- care ---------- */}
      <h2 className="section-title">{t('wellbeing.care')}</h2>

      <button type="button" className="tile" onClick={() => navigate('schedule')}>
        <span className="tile-icon">
          <Icon name="clock" size={28} />
        </span>
        <span className="tile-text">
          <span className="tile-label">
            {next
              ? t('home.next_dose_at', {
                  name: `${next.medicineName} ${formatStrength(next.strength)}`,
                  time: formatTime12h(next.time),
                })
              : t('home.no_schedule')}
          </span>
          <span className="tile-sub">
            {t('home.doses_today', { taken: summary.taken, total: summary.total })}
          </span>
        </span>
      </button>

      <button
        type="button"
        className="tile"
        onClick={() => navigate(checkup ? 'appointments' : 'doctors')}
      >
        <span className="tile-icon">
          <Icon name="calendar" size={28} />
        </span>
        <span className="tile-text">
          <span className="tile-label">{checkupDoctor?.fullName ?? t('appointments.book')}</span>
          <span className="tile-sub">
            {checkup
              ? `${formatDateLong(checkup.date, locale)} · ${formatTime12h(checkup.time)}`
              : t('doctors.title')}
          </span>
        </span>
      </button>

      <button type="button" className="tile" onClick={() => navigate('scan')}>
        <span className="tile-icon">
          <Icon name="camera" size={28} />
        </span>
        <span className="tile-text">
          <span className="tile-label">{t('home.scan')}</span>
          <span className="tile-sub">{t('home.scan_sub')}</span>
        </span>
      </button>

      <button type="button" className="tile" onClick={() => navigate('voice')}>
        <span className="tile-icon">
          <Icon name="mic" size={28} />
        </span>
        <span className="tile-text">
          <span className="tile-label">{t('home.voice')}</span>
          <span className="tile-sub">{t('home.voice_sub')}</span>
        </span>
      </button>

      <SafetyNote />
      <Toast message={toast} />
    </div>
  );
}
