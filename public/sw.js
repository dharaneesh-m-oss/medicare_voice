/**
 * MediCare Voice service worker.
 *
 * The app already holds all of its data locally, so the only thing standing
 * between it and working offline is the shell. Strategy:
 *
 *   navigation  -> network first, falling back to the cached shell, so a phone
 *                  with no signal still opens the app instead of a dinosaur.
 *   same-origin -> cache first, then network, because Vite fingerprints every
 *   assets         asset filename: a cached hit can never be stale.
 *   anything else  passes straight through (there is nothing else — the app
 *                  makes no network calls).
 *
 * CACHE_VERSION is bumped by the build; changing it retires the old cache on
 * the next activation.
 */

const CACHE_VERSION = 'medicare-v3';
const SHELL = self.registration.scope;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) =>
        cache.addAll([SHELL, `${SHELL}manifest.webmanifest`, `${SHELL}favicon.svg`]),
      )
      // A missing shell file must not block installation.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(SHELL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL).then((cached) => cached ?? Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
