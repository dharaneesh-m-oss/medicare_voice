import { useMemo, useState, type CSSProperties } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator, type ScreenName } from '../../../app/Navigator';
import { nextCheckup } from '../../../core/clinic/AppointmentService';
import type { TranslationKey } from '../../../core/i18n';
import { getInsightsEngine } from '../../../core/insights/InsightsEngine';
import { buildDayView, getNextDose, summariseDay } from '../../../core/scheduler/MedicationScheduler';
import { formatStrength } from '../../../core/types';
import { formatDateLong, formatTime12h, toISODate } from '../../../core/utils/date';
import type { FivePoint } from '../../../core/wellness/types';
import { goalStreak, todayLog, todayMood } from '../../../core/wellness/WellnessService';
import { Icon, type IconName } from '../../components/Icon';
import { SafetyNote, SpeakButton } from '../../components/common';
import { Chip, InsightCard, Panel, Toast, useToast } from '../../components/kit';

const FACES = ['😞', '🙁', '😐', '🙂', '😄'];
const LEVELS: FivePoint[] = [1, 2, 3, 4, 5];

const PILLAR_ICON: Record<string, IconName> = {
  movement: 'steps',
  sleep: 'moon',
  hydration: 'droplet',
  mood: 'smile',
  medication: 'pills',
};

/** The score ring — big, animated, and the first thing on the screen. */
function ScoreRing({ score }: { score: number | null }) {
  const size = 128;
  const radius = size / 2 - 11;
  const circumference = 2 * Math.PI * radius;
  const pct = score === null ? 0 : score / 100;

  return (
    <div className="score-figure">
      <svg width={size} height={size} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={11}
        />
        <circle
          className="ring-progress"
          style={{ '--ring-circ': circumference } as unknown as CSSProperties}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ffffff"
          strokeWidth={11}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="score-readout">
        <div className="score-number">{score ?? '—'}</div>
        <div className="score-outof">/ 100</div>
      </div>
    </div>
  );
}

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

  const quick: { icon: IconName; value: string; label: string }[] = [
    { icon: 'steps', value: String(today?.steps ?? 0), label: t('wellness.steps') },
    { icon: 'moon', value: String(today?.sleepHours ?? 0), label: t('wellness.sleep') },
    { icon: 'droplet', value: String(today?.waterGlasses ?? 0), label: t('wellness.water') },
    {
      icon: 'pills',
      value: `${summary.taken}/${summary.total}`,
      label: t('nav.medicines'),
    },
  ];

  return (
    <div className="page">
      <div className="row">
        <span className="muted">
          {t(greetingKey)}, {patient?.fullName.split(' ')[0] ?? ''}
        </span>
        <SpeakButton text={spoken} compact />
      </div>

      {/* ---------- the score ---------- */}
      <div className="score-hero">
        <div className="score-main">
          <ScoreRing score={wellbeing.score} />
          <div className="score-copy">
            <span className="detail-label" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {t('wellbeing.score')}
            </span>
            <span className="score-band">
              {wellbeing.score === null ? t('wellbeing.no_data') : bandLabel}
            </span>
            {trendLabel && (
              <span className="score-trend">
                <Icon name="activity" size={16} />
                {trendLabel}
              </span>
            )}
            <span className="score-note">
              {t('wellbeing.days_logged', { count: wellbeing.daysLogged })}
              {streak > 0 ? ` · ${t('wellness.streak_days', { count: streak })}` : ''}
            </span>
          </div>
        </div>

        {showPillars && (
          <div className="pillars">
            {wellbeing.pillars.map((pillar) => (
              <div
                className={pillar.hasData ? 'pillar' : 'pillar pillar-empty'}
                key={pillar.key}
              >
                <span className="pillar-name">
                  <Icon name={PILLAR_ICON[pillar.key]} size={16} />{' '}
                  {t(`pillar.${pillar.key}` as TranslationKey)}
                </span>
                <span className="pillar-track">
                  <span
                    className="pillar-fill"
                    style={{ width: `${pillar.hasData ? pillar.value : 0}%` }}
                  />
                </span>
                <span className="pillar-value">
                  {pillar.hasData ? `${pillar.value}%` : t('wellbeing.no_pillar_data')}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowPillars((v) => !v)}
        >
          {showPillars ? t('common.close') : t('wellbeing.pillars')}
        </button>
        <span className="score-note">{t('wellbeing.score_hint')}</span>
      </div>

      {/* ---------- today at a glance ---------- */}
      <h2 className="section-title">{t('wellbeing.today')}</h2>
      <div className="quick-grid">
        {quick.map((item) => (
          <div className="quick-stat" key={item.label}>
            <span className="quick-icon">
              <Icon name={item.icon} size={22} />
            </span>
            <span className="quick-value">{item.value}</span>
            <span className="quick-label">{item.label}</span>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-secondary" onClick={() => navigate('wellness')}>
        <Icon name="edit" size={24} />
        {t('wellbeing.quick_log')}
      </button>

      {/* ---------- one-tap mood ---------- */}
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
        <span className="muted">{t('wellbeing.tap_mood')}</span>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('mood')}>
          {t('mood.title')}
        </button>
      </Panel>

      {/* ---------- calm ---------- */}
      <button
        type="button"
        className="tile tile-primary"
        onClick={() => navigate('breathe')}
      >
        <span className="tile-icon">
          <Icon name="heart" size={32} />
        </span>
        <span className="tile-text">
          <span className="tile-label">{t('wellbeing.breathe')}</span>
          <span className="tile-sub">{t('wellbeing.breathe_sub')}</span>
        </span>
      </button>

      {/* ---------- what the engine noticed ---------- */}
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

      {/* ---------- care strip ---------- */}
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
          <span className="tile-label">
            {checkupDoctor?.fullName ?? t('appointments.book')}
          </span>
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

      <p className="footnote">{t('wellbeing.score_hint')}</p>
      <SafetyNote />
      <Toast message={toast} />
    </div>
  );
}
