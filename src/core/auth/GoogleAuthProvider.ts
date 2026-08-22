/**
 * GOOGLE SIGN-IN (Google Identity Services).
 *
 * Real integration, config-gated: set `VITE_GOOGLE_CLIENT_ID` in `.env.local`
 * and the button below becomes a genuine Google account chooser. Without it the
 * app stays fully usable through email sign-in, and the UI says plainly that
 * Google sign-in is not configured rather than pretending.
 *
 * Security note: this decodes the ID token in the browser to read the profile,
 * which is fine for a local-first prototype. A deployed build must send the raw
 * `credential` to a backend and verify the signature, `aud`, `iss` and `exp`
 * against Google's public keys before trusting anything in it.
 */

const GSI_SRC = 'https://accounts.google.com/gsi/client';

export interface GoogleProfile {
  subject: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  photoUrl: string | null;
}

interface GsiCredentialResponse {
  credential: string;
}

interface GsiIdApi {
  initialize(config: {
    client_id: string;
    callback: (response: GsiCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    ux_mode?: 'popup' | 'redirect';
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'small' | 'medium' | 'large';
      text?: 'signin_with' | 'signup_with' | 'continue_with';
      shape?: 'rectangular' | 'pill';
      width?: number;
      locale?: string;
    },
  ): void;
  prompt(): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GsiIdApi } };
  }
}

export function googleClientId(): string | null {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  return typeof id === 'string' && id.trim().length > 0 ? id.trim() : null;
}

export function isGoogleConfigured(): boolean {
  return googleClientId() !== null;
}

let scriptPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('google_script_failed'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** base64url JSON payload of the ID token. Not a signature check. */
function decodeIdToken(credential: string): GoogleProfile {
  const payload = credential.split('.')[1];
  if (!payload) throw new Error('google_bad_token');
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  const claims = JSON.parse(decodeURIComponent(escape(json))) as Record<string, unknown>;
  return {
    subject: String(claims.sub ?? ''),
    email: String(claims.email ?? ''),
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    fullName: String(claims.name ?? claims.email ?? 'Google user'),
    photoUrl: typeof claims.picture === 'string' ? claims.picture : null,
  };
}

export interface RenderGoogleButtonOptions {
  container: HTMLElement;
  locale?: string;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  onProfile: (profile: GoogleProfile) => void;
  onError: (code: string) => void;
}

/**
 * Mount the official Google button. Resolves once the button is on screen;
 * `onProfile` fires when the user completes the chooser.
 */
export async function renderGoogleButton(options: RenderGoogleButtonOptions): Promise<void> {
  const clientId = googleClientId();
  if (!clientId) {
    options.onError('not_configured');
    return;
  }

  try {
    await loadGsiScript();
  } catch {
    options.onError('script_failed');
    return;
  }

  const api = window.google?.accounts?.id;
  if (!api) {
    options.onError('script_failed');
    return;
  }

  api.initialize({
    client_id: clientId,
    ux_mode: 'popup',
    cancel_on_tap_outside: true,
    callback: (response) => {
      try {
        options.onProfile(decodeIdToken(response.credential));
      } catch {
        options.onError('bad_token');
      }
    },
  });

  options.container.innerHTML = '';
  api.renderButton(options.container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: options.text ?? 'continue_with',
    width: Math.min(360, Math.max(240, options.container.clientWidth || 320)),
    locale: options.locale,
  });
}

/**
 * Stand-in used only when no client id is configured, so the Google *sign-up
 * flow* (profile prefill, account linking, role choice) can still be reviewed.
 * The UI labels it as a simulation — it never claims a real Google sign-in.
 */
export function demoGoogleProfile(seed = 'demo'): GoogleProfile {
  const n = Math.abs([...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % 1000;
  return {
    subject: `demo-google-${n}`,
    email: `demo.user${n}@gmail.com`,
    emailVerified: true,
    fullName: 'Demo Google User',
    photoUrl: null,
  };
}
