import type { ReactNode } from 'react';

import { useApp } from '../../app/AppState';
import { useSpeech } from '../../app/useSpeech';
import { Icon, type IconName } from './Icon';

/* ---------------- home tile ---------------- */

interface TileProps {
  icon: IconName;
  label: string;
  sub?: string;
  onClick: () => void;
  primary?: boolean;
}

export function Tile({ icon, label, sub, onClick, primary }: TileProps) {
  return (
    <button
      type="button"
      className={primary ? 'tile tile-primary' : 'tile'}
      onClick={onClick}
    >
      <span className="tile-icon">
        <Icon name={icon} size={primary ? 34 : 30} />
      </span>
      <span className="tile-text">
        <span className="tile-label">{label}</span>
        {sub && <span className="tile-sub">{sub}</span>}
      </span>
    </button>
  );
}

/* ---------------- status badge ---------------- */

export type Tone = 'success' | 'warn' | 'danger' | 'info';

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  const icon: IconName = tone === 'success' ? 'check' : tone === 'info' ? 'clipboard' : 'alert';
  return (
    <span className={`badge badge-${tone}`}>
      <Icon name={icon} size={20} strokeWidth={2.6} />
      {children}
    </span>
  );
}

/* ---------------- listen button ---------------- */

/** Reads a block of text aloud. Present on every result-bearing screen. */
export function SpeakButton({ text, compact }: { text: string; compact?: boolean }) {
  const { t, settings } = useApp();
  const { speak, stopSpeaking, speaking, synthesisSupported } = useSpeech();

  if (!synthesisSupported || !settings.voiceEnabled) return null;

  const onClick = () => (speaking ? stopSpeaking() : speak(text));

  if (compact) {
    return (
      <button
        type="button"
        className="header-btn"
        onClick={onClick}
        aria-label={speaking ? t('common.stop') : t('common.listen')}
      >
        <Icon name="speaker" size={24} />
      </button>
    );
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={onClick}>
      <Icon name="speaker" size={26} />
      {speaking ? t('common.stop') : t('common.listen')}
    </button>
  );
}

/* ---------------- form pieces ---------------- */

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

interface OptionGroupProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label?: string;
}

export function OptionGroup<T extends string>({
  value,
  options,
  onChange,
  label,
}: OptionGroupProps<T>) {
  return (
    <div className="field">
      {label && <span className="field-label">{label}</span>}
      <div className="options" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="option"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ToggleRow({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="toggle-row">
      <span>
        <span style={{ fontWeight: 700 }}>{label}</span>
        {hint && <span className="muted" style={{ display: 'block' }}>{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="switch"
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

/* ---------------- modal ---------------- */

export function Modal({
  title,
  children,
  onClose,
  closeLabel,
}: {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
}) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <h2 className="modal-title">{title}</h2>
        {children}
        {onClose && (
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {closeLabel ?? 'Close'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- safety note ---------------- */

/** The one line that must appear wherever the app talks about a medicine. */
export function SafetyNote() {
  const { t } = useApp();
  return (
    <p className="footnote">
      <Icon name="shield" size={16} /> {t('safety.disclaimer')}
    </p>
  );
}
