import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import { LANGUAGES } from '../../../core/i18n';
import type { LanguageCode } from '../../../core/types';
import { Icon } from '../../components/Icon';

export function WelcomeScreen() {
  const { t, settings, patchSettings } = useApp();
  const { navigate } = useNavigator();

  return (
    <section className="screen">
      <div className="splash">
        <div className="splash-logo">
          <Icon name="shield" size={56} strokeWidth={1.8} />
        </div>

        <div className="stack-sm">
          <h1>{t('app.name')}</h1>
          <p>{t('auth.welcome_title')}</p>
          <p style={{ fontSize: '0.86em', opacity: 0.9 }}>{t('auth.welcome_sub')}</p>
        </div>

        <div className="field">
          <span className="field-label">{t('splash.language_prompt')}</span>
          <div className="options">
            {LANGUAGES.map((language) => (
              <button
                key={language.code}
                type="button"
                className="option"
                aria-pressed={settings.language === language.code}
                onClick={() => patchSettings({ language: language.code as LanguageCode })}
              >
                {language.nativeName}
              </button>
            ))}
          </div>
        </div>

        <div className="stack">
          <button
            type="button"
            className="btn btn-lg btn-secondary"
            onClick={() => navigate('signin')}
          >
            {t('auth.signin')}
          </button>
          <button
            type="button"
            className="btn btn-lg btn-ghost"
            style={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.6)' }}
            onClick={() => navigate('signup')}
          >
            {t('auth.signup')}
          </button>
        </div>

        <p className="footnote" style={{ color: 'inherit', opacity: 0.85 }}>
          {t('app.prototype_badge')} · {t('safety.disclaimer')}
        </p>
      </div>
    </section>
  );
}
