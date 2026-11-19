// Baho service worker: keeps the app shell and audio lessons available offline.
// Lesson text and FAQs come from the API (under /api/ on the same site when
// deployed, or another origin in development); the app keeps its own copy of
// those in localStorage (see src/lib/offline.ts), so the worker leaves API
// requests alone and they always reach the server.
// Bump the version when the caching rules change so old caches are removed.
const VERSION = 'baho-v7';
const SHELL_CACHE = `${VERSION}-shell`;
const AUDIO_CACHE = `${VERSION}-audio`;

const SHELL_FILES = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

// The built JS and CSS have hashed names that change with every build, so they are
// read from index.html at install time. Caching them here means the app opens
// offline even right after the first visit, not only once the browser cache has them.
const builtAssets = async () => {
  const html = await (await fetch('/index.html', { cache: 'no-store' })).text();
  return [...new Set(html.match(/\/assets\/[^"'\s>]+/g) ?? [])];
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    builtAssets()
      .catch(() => [])
      .then((assets) => caches.open(SHELL_CACHE).then((cache) => cache.addAll([...SHELL_FILES, ...assets])))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const cacheFirst = async (request, cacheName) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.status === 200) (await caches.open(cacheName)).put(request, response.clone());
  return response;
};

// Audio players ask for byte ranges. The whole recording is fetched and cached
// once, and each range request is answered with the matching slice, so seeking
// works online and offline.
const cachedRecording = async (request) => {
  const cache = await caches.open(AUDIO_CACHE);
  let response = await cache.match(request.url);
  if (!response) {
    response = await fetch(request.url);
    if (response.status !== 200) return response;
    await cache.put(request.url, response.clone());
  }
  const range = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range') || '');
  if (!range) return response;
  const blob = await response.blob();
  const start = Number(range[1] || 0);
  const end = range[2] ? Math.min(Number(range[2]), blob.size - 1) : blob.size - 1;
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${blob.size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Lesson recordings: kept after the first play so they work offline.
  if (url.pathname.startsWith('/api/v1/media/')) {
    event.respondWith(cachedRecording(request));
    return;
  }
  if (url.pathname.startsWith('/api/')) return;

  // Page navigations: try the network, fall back to the cached app shell.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }

  // Built JS/CSS and icons.
  event.respondWith(cacheFirst(request, SHELL_CACHE));
});

// Notifications.
//
// The server encrypts each message to this device's own keys, so the push
// service that carries it cannot read it. The text says what happened and never
// what was said: a learner reads the answer, or their reminder, inside the app.
self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { body: event.data?.text() };
  }
  if (!message.body) return;

  event.waitUntil(self.registration.showNotification(message.title || 'Baho', {
    body: message.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    lang: 'rw',
    // Replaces an earlier notification about the same thing rather than
    // stacking a second one on a phone the learner has not picked up.
    tag: message.tag || 'baho',
    renotify: Boolean(message.tag),
    data: { url: message.url || '/' }
  }));
});

// Tapping it opens Baho. A tab that is already open is brought forward instead
// of a second one being started, so the learner lands where they left off.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin);
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of open) {
      if (new URL(client.url).origin === target.origin) return client.focus();
    }
    return self.clients.openWindow(target.href);
  })());
});
