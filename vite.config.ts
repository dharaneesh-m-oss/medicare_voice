import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * A RELATIVE base, so one build runs everywhere this app is published:
 *
 *   Vercel / Netlify   served at the domain root
 *   GitHub Pages       served from /medicare_voice/
 *   Android (Capacitor) loaded from the APK, with no host at all
 *
 * An absolute base would have to be correct for exactly one of those and would
 * silently 404 every asset on the others — a white screen with no error.
 *
 * `./` is only safe because this app never changes the URL path: navigation is
 * a screen stack, and `history.pushState(state, '')` is called without a URL.
 * If real client-side routes are ever added, deep links would resolve assets
 * against the wrong directory and the base must become per-target again.
 */
export default defineConfig({
  base: './',
  plugins: [react()],
});
