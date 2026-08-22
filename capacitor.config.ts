import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the same built web app in a native Android shell.
 *
 * `webDir` points at the Vite output, which for the app build is produced with
 * a relative base (`vite build --base ./`) because the shell loads the files
 * from the APK rather than from a web server.
 */
const config: CapacitorConfig = {
  appId: 'in.medicarevoice.app',
  appName: 'MediCare Voice',
  webDir: 'dist',
  android: {
    // The app makes no network calls; refuse mixed content outright.
    allowMixedContent: false,
  },
};

export default config;
