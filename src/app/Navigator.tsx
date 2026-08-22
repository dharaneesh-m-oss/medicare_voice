/**
 * NAVIGATOR — a screen stack, not a URL router.
 *
 * An elderly-focused app has one rule: every screen has exactly one visible way
 * back. A stack models that better than routes, and it maps 1:1 onto an Android
 * activity/fragment back stack later. The hardware/browser back button is wired
 * through `popstate`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ScreenName =
  /* shared */
  | 'splash'
  | 'welcome'
  | 'signin'
  | 'signup'
  | 'settings'
  | 'demo'
  | 'notifications'
  /* patient */
  | 'home'
  | 'scan'
  | 'result'
  | 'medicines'
  | 'add'
  | 'schedule'
  | 'voice'
  | 'history'
  | 'appointments'
  | 'book'
  | 'records'
  | 'wellness'
  | 'mood'
  | 'breathe'
  | 'doctors'
  | 'profile'
  /* doctor */
  | 'doctor_home'
  | 'doctor_patients'
  | 'doctor_patient'
  | 'doctor_appointments'
  | 'doctor_consult'
  /* hospital desk */
  | 'hospital_home'
  | 'hospital_appointments'
  | 'hospital_patients'
  | 'hospital_doctors';

export interface ScreenParams {
  /** Prefill for the Add Medicine screen (used after a scan). */
  prefillName?: string;
  prefillStrength?: string;
  prefillUnit?: string;
  prefillForm?: string;
  prefillExpiry?: string;
  /** Open the scan screen straight onto the sample picker. */
  openSamples?: boolean;
  /** Run one scan immediately with this sample pack (demo mode). */
  autoSamplePackId?: string;
  /** Sign-up flow: preselected role, and Google prefill. */
  signUpRole?: 'patient' | 'doctor' | 'hospital_admin';
  googleSubject?: string;
  googleEmail?: string;
  googleName?: string;
  googlePhoto?: string;
  /** Clinic screens. */
  patientId?: string;
  doctorId?: string;
  appointmentId?: string;
  /** Which tab a screen should open on. */
  tab?: string;
}

interface StackEntry {
  screen: ScreenName;
  params: ScreenParams;
}

interface NavigatorValue {
  screen: ScreenName;
  params: ScreenParams;
  depth: number;
  navigate: (screen: ScreenName, params?: ScreenParams) => void;
  replace: (screen: ScreenName, params?: ScreenParams) => void;
  goBack: () => void;
  goHome: () => void;
  /** Replace the whole stack — used by the bottom tabs / side rail. */
  setRoot: (screen: ScreenName, params?: ScreenParams) => void;
}

const NavigatorContext = createContext<NavigatorValue | null>(null);

export function NavigatorProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<StackEntry[]>([{ screen: 'splash', params: {} }]);

  useEffect(() => {
    const onPop = () => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((screen: ScreenName, params: ScreenParams = {}) => {
    setStack((prev) => {
      const next = [...prev, { screen, params }];
      window.history.pushState({ depth: next.length }, '');
      return next;
    });
  }, []);

  const replace = useCallback((screen: ScreenName, params: ScreenParams = {}) => {
    setStack((prev) => [...prev.slice(0, -1), { screen, params }]);
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      window.history.replaceState({ depth: prev.length - 1 }, '');
      return prev.slice(0, -1);
    });
  }, []);

  const goHome = useCallback(() => {
    setStack([{ screen: 'home', params: {} }]);
    window.history.replaceState({ depth: 1 }, '');
  }, []);

  const setRoot = useCallback((screen: ScreenName, params: ScreenParams = {}) => {
    setStack([{ screen, params }]);
    window.history.replaceState({ depth: 1 }, '');
  }, []);

  const current = stack[stack.length - 1];

  const value = useMemo<NavigatorValue>(
    () => ({
      screen: current.screen,
      params: current.params,
      depth: stack.length,
      navigate,
      replace,
      goBack,
      goHome,
      setRoot,
    }),
    [current, stack.length, navigate, replace, goBack, goHome, setRoot],
  );

  return <NavigatorContext.Provider value={value}>{children}</NavigatorContext.Provider>;
}

export function useNavigator(): NavigatorValue {
  const ctx = useContext(NavigatorContext);
  if (!ctx) throw new Error('useNavigator must be used inside <NavigatorProvider>');
  return ctx;
}
