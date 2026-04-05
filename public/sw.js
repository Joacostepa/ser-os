// SER Mayorista — Service Worker
const CACHE_NAME = 'ser-mayorista-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// ═══════════════════════════════════════
// INSTALL
// ═══════════════════════════════════════
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ═══════════════════════════════════════
// ACTIVATE
// ═══════════════════════════════════════
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ═══════════════════════════════════════
// PUSH — receive push notifications
// ═══════════════════════════════════════
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.tag || 'default',
    renotify: true,
    data: {
      url: data.url || '/',
      notificacion_id: data.notificacion_id,
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SER Mayorista', options)
  );
});

// ═══════════════════════════════════════
// NOTIFICATION CLICK
// ═══════════════════════════════════════
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );

  if (event.notification.data?.notificacion_id) {
    fetch('/api/notificaciones/leer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [event.notification.data.notificacion_id] }),
    }).catch(() => {});
  }
});

// ═══════════════════════════════════════
// FETCH — network first, cache fallback
// ═══════════════════════════════════════
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
