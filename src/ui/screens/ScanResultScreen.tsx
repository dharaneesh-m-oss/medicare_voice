import { useEffect, useMemo, useState } from 'react';

import { useApp } from '../../app/AppState';
import { useNavigator } from '../../app/Navigator';
import { useSpeech } from '../../app/useSpeech';
import type { TranslationKey } from '../../core/i18n';
import { createId, formatStrength, type Medicine } from '../../core/types';
import { formatTime12h, printedToExpiry } from '../../core/utils/date';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { SafetyNote, SpeakButton, StatusBadge, type Tone } from '../components/common';

const EXPIRY_LABEL: Record<string, TranslationKey> = {
  valid: 'result.status_valid',
  expired: 'result.status_expired',
  expiring_soon: 'result.status_expiring',
  unknown: 'result.status_unknown',
};

const EXPIRY_TONE: Record<string, Tone> = {
  valid: 'success',
  expired: 'danger',
  expiring_soon: 'warn',
  unknown: 'warn',
};

const VERDICT: Record<string, { key: TranslationKey; tone: Tone; accent: string }> = {
  safe: { key: 'result.verdict_safe', tone: 'success', accent: 'card-accent-success' },
  caution: { key: 'result.verdict_caution', tone: 'warn', accent: 'card-accent-warn' },
  unsafe: { key: 'result.verdict_unsafe', tone: 'danger', accent: 'card-accent-danger' },
};

export function ScanResultScreen() {
  const { t, lastScan, addMedicine, medicines, settings } = useApp();
  const { navigate, goHome } = useNavigator();
  const { speak } = useSpeech();
  const [showText, setShowText] = useState(false);
  const [added, setAdded] = useState(false);

  const spoken = useMemo(() => {
    if (!lastScan) return '';
    const { recognition, verification } = lastScan;
    const parts = [
      `${recognition.medicineName} ${formatStrength(recognition.strength)} ${t(
        `form.${recognition.dosageForm}` as TranslationKey,
      )}.`,
      ...verification.messages.map((m) => t(m.key as TranslationKey, m.params)),
    ];
    return parts.join(' ');
  }, [lastScan, t]);

  useEffect(() => {
    if (settings.autoSpeakResults && spoken) speak(spoken);
    // speak once per scan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastScan?.id]);

  if (!lastScan) {
    return (
      <Screen title={t('result.title')}>
        <p className="empty">{t('assistant.no_scan')}</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('scan')}>
          {t('home.scan')}
        </button>
      </Screen>
    );
  }

  const { recognition, ocr, verification } = lastScan;
  const verdict = VERDICT[verification.overall];
  const alreadySaved =
    added ||
    medicines.some(
      (m) =>
        m.name.toLowerCase() === recognition.medicineName.toLowerCase() &&
        formatStrength(m.strength) === formatStrength(recognition.strength) &&
        m.expiry === printedToExpiry(ocr.fields.expiry),
    );

  const saveToCabinet = () => {
    const medicine: Omit<Medicine, 'patientId'> = {
      id: createId('med'),
      name: recognition.medicineName,
      strength: recognition.strength,
      form: recognition.dosageForm,
      expiry: printedToExpiry(ocr.fields.expiry),
      batchNumber: ocr.fields.batch ?? null,
      addedAt: new Date().toISOString(),
      fromScan: true,
    };
    addMedicine(medicine);
    setAdded(true);
  };

  return (
    <Screen title={t('result.title')} action={<SpeakButton text={spoken} compact />}>
      {lastScan.imageDataUrl && (
        <img className="pack-thumb" src={lastScan.imageDataUrl} alt={t('scan.preview_title')} />
      )}

      <div className={`card ${verdict.accent}`}>
        <StatusBadge tone={verdict.tone}>{t(verdict.key)}</StatusBadge>

        <div>
          <div className="detail">
            <span className="detail-label">{t('result.medicine')}</span>
            <span className="detail-value">{recognition.medicineName}</span>
          </div>
          <div className="detail">
            <span className="detail-label">{t('result.strength')}</span>
            <span className="detail-value">{formatStrength(recognition.strength)}</span>
          </div>
          <div className="detail">
            <span className="detail-label">{t('result.form')}</span>
            <span className="detail-value">
              {t(`form.${recognition.dosageForm}` as TranslationKey)}
            </span>
          </div>
          <div className="detail">
            <span className="detail-label">{t('result.expiry')}</span>
            <span className="detail-value">
              {verification.expiry.printed ?? t('common.unknown')}
            </span>
          </div>
          {ocr.fields.batch && (
            <div className="detail">
              <span className="detail-label">{t('result.batch')}</span>
              <span className="detail-value">{ocr.fields.batch}</span>
            </div>
          )}
          <div className="detail">
            <span className="detail-label">{t('result.status')}</span>
            <span>
              <StatusBadge tone={EXPIRY_TONE[verification.expiry.status]}>
                {t(EXPIRY_LABEL[verification.expiry.status])}
              </StatusBadge>
            </span>
          </div>
        </div>
      </div>

      {/* ---- schedule comparison ---- */}
      <div className="card">
        <h2 className="section-title">{t('result.schedule_section')}</h2>

        {verification.match.status === 'strength_mismatch' && (
          <div className="banner banner-danger">
            <Icon name="alert" size={24} />
            <span>{t('verify.strength_mismatch')}</span>
          </div>
        )}
        {verification.match.status === 'not_in_schedule' && (
          <div className="banner banner-danger">
            <Icon name="alert" size={24} />
            <span>{t('verify.not_in_schedule', { name: verification.match.detectedName })}</span>
          </div>
        )}

        {verification.match.expectedName && (
          <div className="row">
            <div className="stack-sm">
              <span className="detail-label">{t('result.expected')}</span>
              <span className="big-value">
                {verification.match.expectedName} {verification.match.expectedStrengthLabel}
              </span>
            </div>
            <div className="stack-sm">
              <span className="detail-label">{t('result.detected')}</span>
              <span className="big-value">
                {verification.match.detectedName} {verification.match.detectedStrengthLabel}
              </span>
            </div>
          </div>
        )}

        {verification.match.status === 'match' && verification.match.nextTime && (
          <p style={{ margin: 0, fontWeight: 700 }}>
            {t('result.next_dose_at', { time: formatTime12h(verification.match.nextTime) })}
          </p>
        )}

        {verification.match.status === 'no_schedule_data' && (
          <p className="muted" style={{ margin: 0 }}>
            {t('verify.no_schedule_data')}
          </p>
        )}
      </div>

      {/* ---- all findings ---- */}
      <div className="stack">
        {verification.messages.map((message, index) => (
          <div
            key={`${message.key}-${index}`}
            className={
              message.tone === 'danger'
                ? 'banner banner-danger'
                : message.tone === 'warn'
                  ? 'banner banner-warn'
                  : message.tone === 'success'
                    ? 'banner banner-success'
                    : 'banner'
            }
          >
            <span>{t(message.key as TranslationKey, message.params)}</span>
          </div>
        ))}
      </div>

      {recognition.confidence < 0.75 && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('scan', { openSamples: true })}
        >
          {t('result.low_confidence_action')}
        </button>
      )}

      <div className="btn-row">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={saveToCabinet}
          disabled={alreadySaved}
        >
          {alreadySaved ? t('result.added') : t('result.add_to_medicines')}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => navigate('scan')}>
          {t('result.scan_again')}
        </button>
      </div>

      <button type="button" className="btn btn-ghost" onClick={goHome}>
        {t('home.title')}
      </button>

      {/* ---- transparency: what the engines actually produced ---- */}
      <div className="card card-flat card-tight">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setShowText((v) => !v)}
          style={{ minHeight: 48 }}
        >
          {t('result.printed_text')}
        </button>
        {showText && (
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: '0.72em',
              margin: 0,
              color: 'var(--text-muted)',
            }}
          >
            {ocr.fullText || '—'}
          </pre>
        )}
        <p className="footnote">
          {t('result.engine_note', {
            engine: recognition.engineLabel,
            ms: recognition.processingMs + ocr.processingMs,
            percent: Math.round(recognition.confidence * 100),
          })}
          <br />
          {ocr.engineLabel}
        </p>
      </div>

      <SafetyNote />
    </Screen>
  );
}
