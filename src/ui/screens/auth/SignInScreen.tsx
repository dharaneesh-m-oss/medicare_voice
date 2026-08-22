import { useCallback, useState } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import type { GoogleProfile } from '../../../core/auth/GoogleAuthProvider';
import { isGoogleConfigured } from '../../../core/auth/GoogleAuthProvider';
import type { TranslationKey } from '../../../core/i18n';
import { DEMO_LOGINS, DEMO_PASSWORD } from '../../../core/storage/seedDemo';
import { GoogleButton } from '../../components/GoogleButton';
import { Icon } from '../../components/Icon';

export function SignInScreen() {
  const { t, signIn, signInWithGoogle } = useApp();
  const { navigate, goBack } = useNavigator();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (withEmail = email, withPassword = password) => {
    setBusy(true);
    setError(null);
    const result = await signIn(withEmail, withPassword);
    setBusy(false);
    if (!result.ok) setError(`auth.error_${result.error}` as TranslationKey);
    // On success the route guard in <Shell> lands the user on their role's home.
  };

  const onGoogle = useCallback(
    async (profile: GoogleProfile) => {
      const outcome = await signInWithGoogle(profile);
      if (outcome.status === 'signed_in') return;
      navigate('signup', {
        googleSubject: profile.subject,
        googleEmail: profile.email,
        googleName: profile.fullName,
        googlePhoto: profile.photoUrl ?? undefined,
      });
    },
    [signInWithGoogle, navigate],
  );

  return (
    <section className="screen">
      <div className="auth">
        <div className="auth-head">
          <span className="auth-logo">
            <Icon name="shield" size={34} strokeWidth={1.8} />
          </span>
          <h1 className="auth-title">{t('auth.signin')}</h1>
          <p className="auth-sub">{t('app.tagline')}</p>
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="signin-email">
            {t('auth.email')}
          </label>
          <input
            id="signin-email"
            className="auth-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="signin-password">
            {t('auth.password')}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="signin-password"
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit();
              }}
              style={{ paddingRight: 58 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('common.close') : t('common.view')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: 12,
              }}
            >
              <Icon name={showPassword ? 'close' : 'search'} size={20} />
            </button>
          </div>
        </div>

        {error && <div className="auth-error">{t(error)}</div>}

        <button
          type="button"
          className="auth-btn"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? t('common.loading') : t('auth.signin')}
        </button>

        <div className="auth-divider">{t('auth.or_email')}</div>

        {/* Only Google is offered, because Google is the only provider actually
            wired up. A dead Apple button would look right and do nothing. */}
        <GoogleButton text="signin_with" onProfile={onGoogle} />
        {!isGoogleConfigured() && (
          <p className="auth-note">{t('auth.google_not_configured')}</p>
        )}

        {/* One tap into any role, so a reviewer never has to type a password. */}
        <div className="auth-card">
          <span className="auth-label">{t('auth.demo_accounts')}</span>
          {DEMO_LOGINS.map((login) => (
            <div className="auth-card-row" key={login.email}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: '0.88em' }}>
                  {login.name}
                </span>
                <span style={{ display: 'block', fontSize: '0.74em', opacity: 0.82 }}>
                  {t(login.descriptionKey as TranslationKey)}
                </span>
              </span>
              <button
                type="button"
                className="auth-use"
                disabled={busy}
                onClick={() => {
                  setEmail(login.email);
                  setPassword(DEMO_PASSWORD);
                  void submit(login.email, DEMO_PASSWORD);
                }}
              >
                {t('auth.use_account')}
              </button>
            </div>
          ))}
          <span className="auth-note">{t('auth.demo_hint', { password: DEMO_PASSWORD })}</span>
        </div>

        <p className="auth-foot">
          {t('auth.no_account')}{' '}
          <button type="button" className="auth-link" onClick={() => navigate('signup')}>
            {t('auth.signup')}
          </button>
        </p>

        <button type="button" className="auth-link" onClick={goBack}>
          {t('common.back')}
        </button>

        <p className="auth-note">{t('auth.security_note')}</p>
      </div>
    </section>
  );
}
