import { useCallback, useState } from 'react';

import { useApp } from '../../../app/AppState';
import { useNavigator } from '../../../app/Navigator';
import type { GoogleProfile } from '../../../core/auth/GoogleAuthProvider';
import type { TranslationKey } from '../../../core/i18n';
import { DEMO_LOGINS, DEMO_PASSWORD } from '../../../core/storage/seedDemo';
import { GoogleButton } from '../../components/GoogleButton';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Field } from '../../components/common';
import { Chip } from '../../components/kit';

export function SignInScreen() {
  const { t, signIn, signInWithGoogle } = useApp();
  const { navigate } = useNavigator();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (withEmail = email, withPassword = password) => {
    setBusy(true);
    setError(null);
    const result = await signIn(withEmail, withPassword);
    setBusy(false);
    if (!result.ok) {
      setError(`auth.error_${result.error}` as TranslationKey);
    }
    // On success the route guard in <Shell> lands the user on their role's home.
  };

  const onGoogle = useCallback(
    async (profile: GoogleProfile) => {
      const outcome = await signInWithGoogle(profile);
      if (outcome.status === 'signed_in') return;
      // New Google user — finish the profile before the account exists.
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
    <Screen title={t('auth.signin')}>
      <GoogleButton text="signin_with" onProfile={onGoogle} />

      <div className="divider-text">{t('auth.or_email')}</div>

      <Field label={t('auth.email')}>
        <input
          className="input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field label={t('auth.password')}>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />
      </Field>

      {error && <div className="banner banner-danger">{t(error)}</div>}

      <button
        type="button"
        className="btn btn-lg btn-primary"
        disabled={busy}
        onClick={() => void submit()}
      >
        <Icon name="lock" size={24} />
        {busy ? t('common.loading') : t('auth.signin')}
      </button>

      <div className="row">
        <span className="muted">{t('auth.no_account')}</span>
        <button type="button" className="link-button" onClick={() => navigate('signup')}>
          {t('auth.signup')}
        </button>
      </div>

      {/* One-tap demo accounts so a reviewer can see every role immediately. */}
      <div className="panel">
        <div className="panel-head">
          <h3>{t('auth.demo_accounts')}</h3>
          <Chip>{t('app.prototype_badge')}</Chip>
        </div>
        <div className="panel-body">
          {DEMO_LOGINS.map((login) => (
            <div className="row" key={login.email}>
              <span className="stack-sm" style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 700 }}>{login.name}</span>
                <span className="muted">{t(login.descriptionKey as TranslationKey)}</span>
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: 'auto', minHeight: 48, padding: '8px 18px' }}
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
          <p className="footnote">{t('auth.demo_hint', { password: DEMO_PASSWORD })}</p>
        </div>
      </div>

      <p className="footnote">{t('auth.security_note')}</p>
    </Screen>
  );
}
