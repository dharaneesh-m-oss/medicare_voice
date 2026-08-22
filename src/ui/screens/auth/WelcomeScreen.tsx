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
      <div className="auth">
        <div className="auth-head">
          <span className="auth-logo">
            <Icon name="shield" size={38} strokeWidth={1.8} />
          </span>
          <h1 className="auth-title">{t('app.name')}</h1>
          <p className="auth-sub">{t('auth.welcome_title')}</p>
        </div>

        <p className="auth-note">{t('auth.welcome_sub')}</p>

        <div className="auth-field">
          <span className="auth-label">{t('splash.language_prompt')}</span>
          <div className="auth-row">
            {LANGUAGES.map((language) => (
              <button
                key={language.code}
                type="button"
                className="auth-glass-btn"
                aria-pressed={settings.language === language.code}
                onClick={() => patchSettings({ language: language.code as LanguageCode })}
              >
                {language.nativeName}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="auth-btn" onClick={() => navigate('signin')}>
          {t('auth.signin')}
        </button>

        <button
          type="button"
          className="auth-glass-btn"
          style={{ width: '100%' }}
          onClick={() => navigate('signup')}
        >
          {t('auth.signup')}
        </button>

        <p className="auth-foot">
          {t('app.prototype_badge')} · {t('safety.disclaimer')}
        </p>
      </div>
    </section>
  );
}
