const VERSION = 'v3';
const SHELL_CACHE = `galih-todo-shell-${VERSION}`;
const PAGE_CACHE  = `galih-todo-pages-${VERSION}`;
const IMAGE_CACHE = `galih-todo-images-${VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, PAGE_CACHE, IMAGE_CACHE];

const OFFLINE_URL = './offline.html';
const SHELL = [
  OFFLINE_URL,
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

// INSTALL: precache app shell 
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('galih-todo-') && !CURRENT_CACHES.includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

 
// Navigasi halaman PHP: Network First -> cache halaman terakhir -> offline.html
async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const res = await fetch(request);
    // Jangan simpan response hasil redirect (tidak boleh disajikan untuk navigasi)
    if (res.ok && !res.redirected) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request)) || (await caches.match(OFFLINE_URL));
  }
}

// Aset shell (CSS/JS/manifest/ikon): Stale-While-Revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  const fetching = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached || Response.error());
  return cached || fetching;
}

// Gambar lampiran (nama file acak, tidak pernah berubah): Cache First
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return Response.error();
  }
}

// FETCH
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;               
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(networkFirstPage(req));
    return;
  }
  if (url.pathname.includes('/uploads/')) {
    event.respondWith(cacheFirst(req, IMAGE_CACHE));
    return;
  }
  if (/\.(css|js|json|png)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

// NOTIFIKASI 
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      if (list.length && 'focus' in list[0]) return list[0].focus();
      return clients.openWindow('./index.php');
    })
  );
});
