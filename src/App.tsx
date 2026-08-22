import { useEffect, useMemo, useRef } from 'react';

import { AppProvider, useApp } from './app/AppState';
import { NavigatorProvider, useNavigator, type ScreenName } from './app/Navigator';
import { RemindersProvider } from './app/Reminders';
import type { Role } from './core/auth/types';
import { ReminderOverlay } from './ui/components/ReminderOverlay';
import { Icon } from './ui/components/Icon';
import { Avatar, Rail, TabBar, TopBar, type CentreAction, type NavItem } from './ui/components/kit';

/* screens — shared */
import { AddMedicineScreen } from './ui/screens/AddMedicineScreen';
import { DemoScreen } from './ui/screens/DemoScreen';
import { HistoryScreen } from './ui/screens/HistoryScreen';
import { MyMedicinesScreen } from './ui/screens/MyMedicinesScreen';
import { ScanResultScreen } from './ui/screens/ScanResultScreen';
import { ScanScreen } from './ui/screens/ScanScreen';
import { ScheduleScreen } from './ui/screens/ScheduleScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { VoiceScreen } from './ui/screens/VoiceScreen';

/* screens — auth */
import { SignInScreen } from './ui/screens/auth/SignInScreen';
import { SignUpScreen } from './ui/screens/auth/SignUpScreen';
import { WelcomeScreen } from './ui/screens/auth/WelcomeScreen';

/* screens — patient */
import { AppointmentsScreen } from './ui/screens/patient/AppointmentsScreen';
import { BookAppointmentScreen } from './ui/screens/patient/BookAppointmentScreen';
import { HealthRecordsScreen } from './ui/screens/patient/HealthRecordsScreen';
import { MoodScreen } from './ui/screens/patient/MoodScreen';
import { BreathingScreen } from './ui/screens/patient/BreathingScreen';
import { DoctorsScreen } from './ui/screens/patient/DoctorsScreen';
import { WellbeingHomeScreen } from './ui/screens/patient/WellbeingHomeScreen';
import { ProfileScreen } from './ui/screens/patient/ProfileScreen';
import { WellnessScreen } from './ui/screens/patient/WellnessScreen';
import { NotificationsScreen } from './ui/screens/NotificationsScreen';

/* screens — doctor */
import { DoctorConsultScreen } from './ui/screens/doctor/DoctorConsultScreen';
import { DoctorHomeScreen } from './ui/screens/doctor/DoctorHomeScreen';
import { DoctorPatientScreen } from './ui/screens/doctor/DoctorPatientScreen';
import { DoctorPatientsScreen } from './ui/screens/doctor/DoctorPatientsScreen';

/* screens — hospital */
import { HospitalAppointmentsScreen } from './ui/screens/hospital/HospitalAppointmentsScreen';
import { HospitalDoctorsScreen } from './ui/screens/hospital/HospitalDoctorsScreen';
import { HospitalHomeScreen } from './ui/screens/hospital/HospitalHomeScreen';
import { HospitalPatientsScreen } from './ui/screens/hospital/HospitalPatientsScreen';

const AUTH_SCREENS: ScreenName[] = ['splash', 'welcome', 'signin', 'signup'];

const NAV: Record<Role, NavItem[]> = {
  // Four tabs, because the fifth slot is the raised Scan button in the middle.
  // Doctors stays one tap away from the home screen and the More menu.
  patient: [
    { key: 'home', icon: 'activity', labelKey: 'nav.wellness' },
    { key: 'schedule', icon: 'pills', labelKey: 'nav.medicines' },
    { key: 'appointments', icon: 'calendar', labelKey: 'nav.appointments' },
    { key: 'profile', icon: 'user', labelKey: 'nav.more' },
  ],
  doctor: [
    { key: 'doctor_home', icon: 'chart', labelKey: 'nav.dashboard' },
    { key: 'doctor_patients', icon: 'users', labelKey: 'nav.patients' },
    { key: 'profile', icon: 'user', labelKey: 'nav.more' },
  ],
  hospital_admin: [
    { key: 'hospital_home', icon: 'chart', labelKey: 'nav.dashboard' },
    { key: 'hospital_appointments', icon: 'calendar', labelKey: 'nav.appointments' },
    { key: 'hospital_patients', icon: 'users', labelKey: 'nav.patients' },
    { key: 'hospital_doctors', icon: 'stethoscope', labelKey: 'hospital.doctors' },
    { key: 'profile', icon: 'user', labelKey: 'nav.more' },
  ],
};

const HOME_FOR: Record<Role, ScreenName> = {
  patient: 'home',
  doctor: 'doctor_home',
  hospital_admin: 'hospital_home',
};

/** Screens each role may open. Anything else bounces back to that role's home. */
const SHARED: ScreenName[] = ['profile', 'settings', 'notifications'];

const ALLOWED: Record<Role, ScreenName[]> = {
  patient: [
    ...SHARED,
    'home', 'scan', 'result', 'medicines', 'add', 'schedule', 'voice', 'history',
    'appointments', 'book', 'records', 'wellness', 'mood', 'breathe', 'doctors', 'demo',
  ],
  doctor: [
    ...SHARED,
    'doctor_home', 'doctor_appointments', 'doctor_patients', 'doctor_patient',
    'doctor_consult', 'book',
  ],
  hospital_admin: [
    ...SHARED,
    'hospital_home', 'hospital_appointments', 'hospital_patients', 'hospital_doctors',
    'doctor_patient', 'book',
  ],
};

/** Applies the appearance settings to the document root. */
function useAccessibilitySettings() {
  const { settings, locale } = useApp();
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--scale', String(settings.textScale));
    root.dataset.theme = settings.theme;
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.lang = locale;
  }, [settings.textScale, settings.highContrast, settings.theme, locale]);
}

/**
 * Marks the header once content has scrolled beneath it, so the separator and
 * the solid background fade in instead of always being there.
 *
 * Scroll events do not bubble, so this listens in the CAPTURE phase on the
 * frame: one listener covers whichever pane the current screen happens to use.
 */
function useScrolledHeader(frame: React.RefObject<HTMLDivElement | null>, screen: string) {
  useEffect(() => {
    const el = frame.current;
    if (!el) return;

    const mark = (scrolled: boolean) => {
      el.querySelectorAll<HTMLElement>('.topbar, .screen-header').forEach((header) => {
        header.dataset.scrolled = String(scrolled);
      });
    };

    const onScroll = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.classList?.contains('page') && !target?.classList?.contains('screen-body')) {
        return;
      }
      mark(target.scrollTop > 6);
    };

    mark(false); // a freshly mounted screen starts at the top
    el.addEventListener('scroll', onScroll, true);
    return () => el.removeEventListener('scroll', onScroll, true);
  }, [frame, screen]);
}

function CurrentScreen({ screen }: { screen: ScreenName }) {
  switch (screen) {
    /* auth */
    case 'splash':
    case 'welcome':
      return <WelcomeScreen />;
    case 'signin':
      return <SignInScreen />;
    case 'signup':
      return <SignUpScreen />;

    /* patient */
    case 'home':
      return <WellbeingHomeScreen />;
    case 'scan':
      return <ScanScreen />;
    case 'result':
      return <ScanResultScreen />;
    case 'medicines':
      return <MyMedicinesScreen />;
    case 'add':
      return <AddMedicineScreen />;
    case 'schedule':
      return <ScheduleScreen />;
    case 'voice':
      return <VoiceScreen />;
    case 'history':
      return <HistoryScreen />;
    case 'appointments':
      return <AppointmentsScreen />;
    case 'book':
      return <BookAppointmentScreen />;
    case 'records':
      return <HealthRecordsScreen />;
    case 'wellness':
      return <WellnessScreen />;
    case 'mood':
      return <MoodScreen />;
    case 'breathe':
      return <BreathingScreen />;
    case 'doctors':
      return <DoctorsScreen />;
    case 'profile':
      return <ProfileScreen />;

    /* doctor */
    case 'doctor_home':
    case 'doctor_appointments':
      return <DoctorHomeScreen />;
    case 'doctor_patients':
      return <DoctorPatientsScreen />;
    case 'doctor_patient':
      return <DoctorPatientScreen />;
    case 'doctor_consult':
      return <DoctorConsultScreen />;

    /* hospital */
    case 'hospital_home':
      return <HospitalHomeScreen />;
    case 'hospital_appointments':
      return <HospitalAppointmentsScreen />;
    case 'hospital_patients':
      return <HospitalPatientsScreen />;
    case 'hospital_doctors':
      return <HospitalDoctorsScreen />;

    /* shared */
    case 'settings':
      return <SettingsScreen />;
    case 'notifications':
      return <NotificationsScreen />;
    case 'demo':
      return <DemoScreen />;
    default:
      return <WelcomeScreen />;
  }
}

function Shell() {
  const { ready, t, session, account, patient, doctor, hospital, unreadNotifications } = useApp();
  const { screen, depth, setRoot, navigate } = useNavigator();
  const frameRef = useRef<HTMLDivElement>(null);
  useAccessibilitySettings();
  useScrolledHeader(frameRef, screen);

  /* Which way the stack moved, so the incoming screen enters from the right
     side. Derived during render via refs — it must be known on the very frame
     the new screen mounts, and a state update would arrive one frame late. */
  const prevScreen = useRef(screen);
  const prevDepth = useRef(depth);
  const direction = useRef<'forward' | 'back' | 'switch'>('switch');
  if (prevScreen.current !== screen) {
    direction.current =
      depth > prevDepth.current ? 'forward' : depth < prevDepth.current ? 'back' : 'switch';
    prevScreen.current = screen;
    prevDepth.current = depth;
  }

  const role = session?.role ?? null;
  const navItems = role ? NAV[role] : [];
  const isRoot = navItems.some((item) => item.key === screen);
  const isPro = role === 'doctor' || role === 'hospital_admin';

  /* Route guard: keep the stack, the session and the role in step. */
  useEffect(() => {
    if (!ready) return;
    if (!session) {
      if (!AUTH_SCREENS.includes(screen)) setRoot('welcome');
      return;
    }
    if (!ALLOWED[session.role].includes(screen)) {
      setRoot(HOME_FOR[session.role]);
    }
  }, [ready, session, screen, setRoot]);

  /* Scanning a medicine is the app's signature action, so it gets the raised
     button in the middle of the bar rather than a tab of its own. */
  const centreAction: CentreAction | undefined =
    role === 'patient'
      ? { icon: 'camera', label: t('home.scan'), onPress: () => navigate('scan') }
      : undefined;

  const subtitle = useMemo(() => {
    if (!account) return undefined;
    if (doctor) return `${doctor.fullName} · ${doctor.specialization}`;
    if (patient) return patient.fullName;
    return account.fullName;
  }, [account, doctor, patient]);

  if (!ready) {
    // A skeleton of the screen that is about to appear, rather than a spinner:
    // the layout does not jump when the data lands.
    return (
      <div className="app-shell">
        <div className="phone">
          <header className="topbar">
            <span className="brand-mark">
              <Icon name="shield" size={24} />
            </span>
            <div className="topbar-title">
              <strong>{t('app.name')}</strong>
              <span>{t('common.loading')}</span>
            </div>
          </header>
          <div className="skeleton-stack">
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-tile" />
            <div className="skeleton skeleton-tile" />
            <div className="skeleton skeleton-line" style={{ width: '62%' }} />
            <div className="skeleton skeleton-line" style={{ width: '44%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className={isPro ? 'workspace' : 'phone'} ref={frameRef}>
        {isRoot && account && (
          <TopBar
            title={isPro ? (hospital?.name ?? t('app.name')) : t('app.name')}
            subtitle={subtitle}
            left={
              <span className="brand-mark">
                <Icon name="shield" size={24} />
              </span>
            }
            right={
              <>
                <button
                  type="button"
                  className="header-btn bell"
                  onClick={() => navigate('notifications')}
                  aria-label={t('notify.title')}
                >
                  <Icon name="alert" size={22} />
                  {unreadNotifications > 0 && (
                    <span className="bell-dot">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </button>
                <Avatar
                  name={account.fullName}
                  photoUrl={account.photoUrl}
                  onClick={() => navigate('profile')}
                  label={t('profile.title')}
                />
              </>
            }
          />
        )}

        <div className="frame-body">
          {isPro && isRoot && (
            <Rail
              items={navItems}
              current={screen}
              onSelect={(key) => setRoot(key as ScreenName)}
              title={t('nav.dashboard')}
            />
          )}
          <div className="frame-main">
            {/* Keyed on the screen so the entrance animation replays on every
                navigation; the data-dir picks which direction it comes from. */}
            <div className="screen-transition" key={screen} data-dir={direction.current}>
              <CurrentScreen screen={screen} />
            </div>
          </div>
        </div>

        {isRoot && navItems.length > 0 && (
          <TabBar
            items={navItems}
            current={screen}
            onSelect={(key) => setRoot(key as ScreenName)}
            centre={centreAction}
          />
        )}

        {session?.patientId && <ReminderOverlay />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <RemindersProvider>
        <NavigatorProvider>
          <Shell />
        </NavigatorProvider>
      </RemindersProvider>
    </AppProvider>
  );
}
