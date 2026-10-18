// Halaman sekarang dinamis (PHP), jadi: aset statis cache-first, halaman network-first.
const CACHE_NAME = 'todo-app-v2';
const STATIC_ASSETS = ['./style.css', './script.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST (CRUD) langsung ke server
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (/\.(css|js)$/.test(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((res) => { caches.open(CACHE_NAME).then((c) => c.put(req, res.clone())); return res; })
        .catch(() => caches.match(req))
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      if (list.length && 'focus' in list[0]) return list[0].focus();
      return clients.openWindow('./index.php');
    })
  );
});
