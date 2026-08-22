import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The same source ships to three places, each needing a different base URL:
 *
 *   dev            /                  the dev server root
 *   GitHub Pages   /medicare_voice/   served from a repo subpath
 *   Android app    ./                 loaded from the APK, not from a host
 *
 * The first two are the defaults below; the Android build overrides it on the
 * command line (`vite build --base ./`, see the `build:app` script).
 *
 * `isPreview` matters: `vite preview` serves the built output, so it has to use
 * the same base the build baked into index.html, or every asset 404s.
 */
const PAGES_BASE = '/medicare_voice/';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? PAGES_BASE : '/',
  plugins: [react()],
}));
