import { useEffect, useRef, useState } from 'react';

import { useApp } from '../../app/AppState';
import {
  demoGoogleProfile,
  isGoogleConfigured,
  renderGoogleButton,
  type GoogleProfile,
} from '../../core/auth/GoogleAuthProvider';
import { Icon } from './Icon';

/**
 * Renders the real Google account chooser when a client id is configured.
 * When it is not, it says so plainly and offers a clearly-labelled simulated
 * profile so the sign-up flow can still be walked through.
 */
export function GoogleButton({
  text = 'continue_with',
  onProfile,
}: {
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  onProfile: (profile: GoogleProfile) => void;
}) {
  const { t, locale } = useApp();
  const slot = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const configured = isGoogleConfigured();

  useEffect(() => {
    if (!configured || !slot.current) return;
    void renderGoogleButton({
      container: slot.current,
      locale,
      text,
      onProfile,
      onError: (code) => setError(code),
    });
  }, [configured, locale, text, onProfile]);

  if (configured) {
    return (
      <div className="stack-sm">
        <div className="google-slot" ref={slot} />
        {error && <p className="field-error">{t('auth.google_not_configured')}</p>}
      </div>
    );
  }

  return (
    <div className="stack-sm">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onProfile(demoGoogleProfile(String(Date.now())))}
      >
        <Icon name="google" size={24} />
        {t('auth.google_demo')}
      </button>
      <p className="footnote">{t('auth.google_not_configured')}</p>
    </div>
  );
}
