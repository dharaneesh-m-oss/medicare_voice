import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import './styles/global.css';
import './styles/app.css';
import './styles/motion.css';
import './styles/theme.css';
import './styles/glass.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * Register the service worker in production only — in dev it would shadow
 * Vite's module graph and serve stale code. Capacitor loads from a
 * capacitor:// origin where workers are unnecessary, so it is skipped there too.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch((err) => console.warn('[sw] registration failed', err));
  });
}
