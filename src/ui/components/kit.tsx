/**
 * Product UI kit — the pieces the dashboards, records and wellness screens are
 * assembled from. Presentational only; no data access, no business rules.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

import { useApp } from '../../app/AppState';
import type { TranslationKey } from '../../core/i18n';
import type { Insight, InsightSeverity } from '../../core/insights/InsightsEngine';
import { Icon, type IconName } from './Icon';

/* ---------------------------- avatar ---------------------------- */

export function initialsOf(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({
  name,
  photoUrl,
  large,
  plain,
  onClick,
  label,
}: {
  name: string;
  photoUrl?: string | null;
  large?: boolean;
  plain?: boolean;
  onClick?: () => void;
  label?: string;
}) {
  const className = `avatar${large ? ' avatar-lg' : ''}${plain ? ' avatar-plain' : ''}`;
  const content = photoUrl ? <img src={photoUrl} alt="" /> : initialsOf(name);
  if (!onClick) {
    return (
      <span className={className} aria-hidden={!label} aria-label={label}>
        {content}
      </span>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick} aria-label={label ?? name}>
      {content}
    </button>
  );
}

/* ---------------------------- top bar ---------------------------- */

export function TopBar({
  title,
  subtitle,
  left,
  right,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="topbar">
      {left}
      <div className="topbar-title">
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      {right}
    </header>
  );
}

/* ---------------------------- navigation ---------------------------- */

export interface NavItem {
  key: string;
  icon: IconName;
  labelKey: TranslationKey;
}

export function TabBar({
  items,
  current,
  onSelect,
}: {
  items: NavItem[];
  current: string;
  onSelect: (key: string) => void;
}) {
  const { t } = useApp();
  return (
    <nav className="tabbar" aria-label="Main">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="tabbar-item"
          aria-current={item.key === current}
          onClick={() => onSelect(item.key)}
        >
          <Icon name={item.icon} size={26} />
          {t(item.labelKey)}
        </button>
      ))}
    </nav>
  );
}

export function Rail({
  items,
  current,
  onSelect,
  title,
}: {
  items: NavItem[];
  current: string;
  onSelect: (key: string) => void;
  title?: string;
}) {
  const { t } = useApp();
  return (
    <nav className="rail" aria-label="Sections">
      {title && <span className="rail-title">{title}</span>}
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="rail-item"
          aria-current={item.key === current}
          onClick={() => onSelect(item.key)}
        >
          <Icon name={item.icon} size={24} />
          {t(item.labelKey)}
        </button>
      ))}
    </nav>
  );
}

/* ---------------------------- surfaces ---------------------------- */

export type Accent = 'primary' | 'success' | 'warn' | 'danger' | 'violet';

export function Stat({
  label,
  value,
  foot,
  accent = 'primary',
}: {
  label: string;
  value: ReactNode;
  foot?: string;
  accent?: Accent;
}) {
  return (
    <div className={`stat stat-accent-${accent}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {foot && <span className="stat-foot">{foot}</span>}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  flush,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <section className="panel">
      {(title || action) && (
        <div className="panel-head">
          <h3>{title}</h3>
          {action}
        </div>
      )}
      <div className={flush ? 'panel-body panel-body-flush' : 'panel-body'}>{children}</div>
    </section>
  );
}

export function RowItem({
  title,
  sub,
  side,
  onClick,
  leading,
}: {
  title: ReactNode;
  sub?: ReactNode;
  side?: ReactNode;
  onClick?: () => void;
  leading?: ReactNode;
}) {
  const content = (
    <>
      {leading}
      <span className="row-main">
        <span className="row-title">{title}</span>
        {sub && <span className="row-sub">{sub}</span>}
      </span>
      {side && <span className="row-side">{side}</span>}
    </>
  );
  if (!onClick) return <div className="row-item">{content}</div>;
  return (
    <button type="button" className="row-item" onClick={onClick}>
      {content}
    </button>
  );
}

export type ChipTone = 'default' | 'primary' | 'success' | 'warn' | 'danger' | 'violet';

export function Chip({ tone = 'default', children }: { tone?: ChipTone; children: ReactNode }) {
  return <span className={tone === 'default' ? 'chip' : `chip chip-${tone}`}>{children}</span>;
}

export function KeyValue({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="kv">
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`} style={{ display: 'contents' }}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="segmented" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <input
      className="search-input"
      type="search"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="empty">{message}</p>;
}

/* ---------------------------- charts ---------------------------- */

export interface ChartPoint {
  label: string;
  value: number;
}

/** Bars with an optional dashed goal line. Pure SVG, theme-aware. */
export function BarChart({
  points,
  goal,
  height = 96,
}: {
  points: ChartPoint[];
  goal?: number;
  height?: number;
}) {
  const width = 300;
  const max = Math.max(goal ?? 0, ...points.map((p) => p.value), 1) * 1.15;
  const gap = 6;
  const barWidth = points.length > 0 ? (width - gap * (points.length - 1)) / points.length : 0;

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      preserveAspectRatio="none"
    >
      {goal !== undefined && goal > 0 && (
        <line
          x1={0}
          x2={width}
          y1={height - (goal / max) * height}
          y2={height - (goal / max) * height}
          stroke="var(--text-muted)"
          strokeDasharray="5 5"
          strokeWidth={1.5}
        />
      )}
      {points.map((point, index) => {
        const h = Math.max(2, (point.value / max) * (height - 4));
        const met = goal === undefined || point.value >= goal;
        return (
          <rect
            key={point.label}
            className="chart-bar"
            style={{ animationDelay: `${index * 45}ms` }}
            x={index * (barWidth + gap)}
            y={height - h}
            width={barWidth}
            height={h}
            rx={4}
            fill={met ? 'var(--primary)' : 'var(--border-strong)'}
          >
            <title>{`${point.label}: ${point.value}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

/** Line + area for a measurement series, with an optional target band. */
export function LineChart({
  points,
  band,
  height = 110,
}: {
  points: ChartPoint[];
  band?: { min: number; max: number };
  height?: number;
}) {
  const width = 300;
  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const lo = Math.min(...values, band?.min ?? Infinity);
  const hi = Math.max(...values, band?.max ?? -Infinity);
  const pad = (hi - lo) * 0.2 || 5;
  const min = lo - pad;
  const max = hi + pad;
  const y = (value: number) => height - ((value - min) / (max - min)) * height;
  const x = (index: number) =>
    points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${height} L${x(0)},${height} Z`;

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img">
      {band && (
        <rect
          className="chart-band"
          x={0}
          y={y(band.max)}
          width={width}
          height={Math.max(2, y(band.min) - y(band.max))}
          fill="var(--success-soft)"
          stroke="var(--success)"
          strokeDasharray="4 4"
          strokeWidth={1}
        />
      )}
      <path className="chart-area" d={area} fill="var(--primary-soft)" opacity={0.7} />
      <path
        className="chart-line"
        pathLength={1}
        d={line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <circle
          key={p.label}
          className="chart-dot"
          style={{ animationDelay: `${300 + (i / Math.max(1, points.length - 1)) * 500}ms` }}
          cx={x(i)}
          cy={y(p.value)}
          r={3.4}
          fill="var(--primary)"
        >
          <title>{`${p.label}: ${p.value}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function Ring({
  value,
  max,
  label,
  size = 92,
}: {
  value: number;
  max: number;
  label: string;
  size?: number;
}) {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(1, value / max) : 0;

  return (
    <div className="ring-wrap">
      <svg width={size} height={size} role="img" aria-label={label}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={9}
        />
        <circle
          className="ring-progress"
          style={{ '--ring-circ': circumference } as unknown as CSSProperties}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={pct >= 1 ? 'var(--success)' : 'var(--primary)'}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div>
        <div className="ring-value">{Math.round(pct * 100)}%</div>
        <div className="muted">{label}</div>
      </div>
    </div>
  );
}

export function Meter({
  value,
  max,
  tone = 'primary',
}: {
  value: number;
  max: number;
  tone?: 'primary' | 'success' | 'warn' | 'danger';
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={tone === 'primary' ? 'meter' : `meter meter-${tone}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ---------------------------- activity rings ---------------------------- */

export interface RingSpec {
  /** 0..1, clamped — overshooting a goal fills the ring, it never wraps. */
  value: number;
  colour: string;
  label: string;
}

/**
 * Concentric progress arcs, the readout every fitness tracker settled on: three
 * quantities readable at a glance, at arm's length, without reading a word.
 * Each arc animates from empty via the shared `ring-progress` keyframe.
 */
export function ActivityRings({
  rings,
  size = 168,
  centre,
}: {
  rings: RingSpec[];
  size?: number;
  centre?: ReactNode;
}) {
  const stroke = size * 0.082;
  const gap = stroke * 0.42;

  return (
    <div className="rings-figure">
      <svg width={size} height={size} role="img" aria-label={rings.map((r) => r.label).join(', ')}>
        {rings.map((ring, index) => {
          const radius = size / 2 - stroke / 2 - index * (stroke + gap);
          if (radius <= stroke) return null;
          const circumference = 2 * Math.PI * radius;
          const pct = Math.max(0, Math.min(1, ring.value));
          return (
            <g key={ring.label}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={ring.colour}
                strokeOpacity={0.22}
                strokeWidth={stroke}
              />
              <circle
                className="ring-progress"
                style={
                  {
                    '--ring-circ': circumference,
                    animationDelay: `${index * 110}ms`,
                  } as unknown as CSSProperties
                }
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={ring.colour}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - pct)}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              >
                <title>{`${ring.label}: ${Math.round(pct * 100)}%`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      {centre && <div className="rings-centre">{centre}</div>}
    </div>
  );
}

/* ---------------------------- metric card ---------------------------- */

export function MetricCard({
  icon,
  label,
  value,
  unit,
  goalLabel,
  progress,
  colour,
  softColour,
}: {
  icon: IconName;
  label: string;
  value: string | number;
  unit?: string;
  goalLabel?: string;
  /** 0..1 */
  progress?: number;
  colour: string;
  softColour: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-head">
        <span className="metric-icon" style={{ background: softColour, color: colour }}>
          <Icon name={icon} size={20} />
        </span>
        <span className="metric-label">{label}</span>
      </div>

      <span className="metric-value">
        {value}
        {unit && <span className="metric-unit">{unit}</span>}
      </span>

      {progress !== undefined && (
        <span className="metric-track">
          <span
            className="metric-fill"
            style={{
              width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
              background: colour,
            }}
          />
        </span>
      )}

      {goalLabel && <span className="metric-goal">{goalLabel}</span>}
    </div>
  );
}

/* ---------------------------- week strip ---------------------------- */

export function WeekStrip({
  days,
  colour,
  max,
}: {
  days: { label: string; value: number; isToday?: boolean }[];
  colour: string;
  max: number;
}) {
  const ceiling = Math.max(max, ...days.map((d) => d.value), 1);
  return (
    <div className="week-strip">
      {days.map((day, index) => (
        <div
          className={day.isToday ? 'week-day week-today' : 'week-day'}
          key={`${day.label}-${index}`}
        >
          <span className="week-bar">
            <span
              style={{
                height: `${Math.max(4, (day.value / ceiling) * 100)}%`,
                background: day.value >= max ? colour : `${colour}66`,
                animationDelay: `${index * 45}ms`,
              }}
              title={`${day.label}: ${day.value}`}
            />
          </span>
          <span className="week-label">{day.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------- insights ---------------------------- */

const INSIGHT_ICON: Record<string, IconName> = {
  adherence: 'pills',
  refill: 'clipboard',
  expiry: 'alert',
  vitals: 'heart',
  wellness: 'activity',
  mood: 'smile',
  appointment: 'calendar',
};

const INSIGHT_CLASS: Record<InsightSeverity, string> = {
  urgent: 'insight insight-urgent',
  attention: 'insight insight-attention',
  info: 'insight insight-info',
  good: 'insight insight-good',
};

export function InsightCard({
  insight,
  onAction,
}: {
  insight: Insight;
  onAction?: (screen: string) => void;
}) {
  const { t } = useApp();
  return (
    <div className={INSIGHT_CLASS[insight.severity]}>
      <span className="insight-icon">
        <Icon name={INSIGHT_ICON[insight.kind] ?? 'clipboard'} size={24} />
      </span>
      <div className="insight-body">
        <span className="insight-title">{t(insight.titleKey as TranslationKey)}</span>
        <span className="insight-detail">
          {t(insight.detailKey as TranslationKey, insight.params)}
        </span>
        {insight.actionScreen && onAction && (
          <button
            type="button"
            className="link-button"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => onAction(insight.actionScreen as string)}
          >
            {t((insight.actionLabelKey ?? 'common.view') as TranslationKey)} →
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- toast ---------------------------- */

export function useToast(): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), 2600);
    return () => window.clearTimeout(id);
  }, [message]);
  return [message, setMessage];
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}
