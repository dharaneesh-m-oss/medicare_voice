import { useState } from 'react';

import { useApp } from '../../app/AppState';
import { useSpeech } from '../../app/useSpeech';
import { LANGUAGES } from '../../core/i18n';
import { getOcrEngine } from '../../core/ocr';
import { getRecognitionEngine } from '../../core/recognition';
import type { LanguageCode, ThemeName } from '../../core/types';
import { Screen } from '../components/Screen';
import { Modal, OptionGroup, SafetyNote, ToggleRow } from '../components/common';

export function SettingsScreen() {
  const { t, settings, patchSettings, resetDemoData } = useApp();
  const { engineName, recognitionSupported, synthesisSupported } = useSpeech();
  const [confirmReset, setConfirmReset] = useState(false);

  const recogniser = getRecognitionEngine();
  const ocr = getOcrEngine();

  return (
    <Screen title={t('settings.title')}>
      <div className="card">
        <h2 className="section-title">{t('settings.language')}</h2>
        <OptionGroup
          value={settings.language}
          onChange={(value) => patchSettings({ language: value as LanguageCode })}
          options={LANGUAGES.map((language) => ({
            value: language.code,
            label: language.nativeName,
          }))}
        />
      </div>

      <div className="card">
        <h2 className="section-title">{t('settings.display')}</h2>
        <OptionGroup
          label={t('settings.theme')}
          value={settings.theme}
          onChange={(value) => patchSettings({ theme: value as ThemeName })}
          options={[
            { value: 'dark', label: t('settings.theme_dark') },
            { value: 'light', label: t('settings.theme_light') },
          ]}
        />
        <ToggleRow
          label={t('settings.text_size')}
          checked={settings.textScale > 1}
          onChange={(next) => patchSettings({ textScale: next ? 1.3 : 1 })}
        />
        <ToggleRow
          label={t('settings.contrast')}
          checked={settings.highContrast}
          onChange={(next) => patchSettings({ highContrast: next })}
        />
      </div>

      <div className="card">
        <h2 className="section-title">{t('settings.sound')}</h2>
        <ToggleRow
          label={t('settings.voice_enabled')}
          checked={settings.voiceEnabled}
          onChange={(next) => patchSettings({ voiceEnabled: next })}
        />
        <ToggleRow
          label={t('settings.autospeak')}
          checked={settings.autoSpeakResults}
          onChange={(next) => patchSettings({ autoSpeakResults: next })}
        />
        <ToggleRow
          label={t('settings.reminders')}
          checked={settings.remindersEnabled}
          onChange={(next) => patchSettings({ remindersEnabled: next })}
        />
        <OptionGroup
          label={t('settings.snooze')}
          value={String(settings.snoozeMinutes)}
          onChange={(value) => patchSettings({ snoozeMinutes: Number(value) })}
          options={[5, 10, 20, 30].map((minutes) => ({
            value: String(minutes),
            label: t('settings.minutes', { count: minutes }),
          }))}
        />
      </div>

      <div className="card">
        <h2 className="section-title">{t('settings.data')}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {t('settings.storage_note')}
        </p>
        <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)}>
          {t('settings.reset')}
        </button>
      </div>

      <div className="card card-flat">
        <h2 className="section-title">{t('settings.about')}</h2>
        <div className="detail">
          <span className="detail-label">{t('settings.engine')}</span>
          <span style={{ fontWeight: 700 }}>
            {recogniser.displayName}
            {recogniser.isSimulated ? ` · ${t('app.prototype_badge')}` : ''}
          </span>
        </div>
        <div className="detail">
          <span className="detail-label">{t('settings.ocr_engine')}</span>
          <span style={{ fontWeight: 700 }}>{ocr.displayName}</span>
        </div>
        <div className="detail">
          <span className="detail-label">{t('home.voice')}</span>
          <span style={{ fontWeight: 700 }}>
            {engineName} · {recognitionSupported ? 'STT ✓' : 'STT ✗'} ·{' '}
            {synthesisSupported ? 'TTS ✓' : 'TTS ✗'}
          </span>
        </div>
        <p className="footnote">
          {t('app.name')} — {t('app.tagline')}
        </p>
      </div>

      <SafetyNote />

      {confirmReset && (
        <Modal title={t('settings.reset')}>
          <p style={{ margin: 0 }}>{t('settings.reset_confirm')}</p>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                resetDemoData();
                setConfirmReset(false);
              }}
            >
              {t('common.ok')}
            </button>
          </div>
        </Modal>
      )}
    </Screen>
  );
}
