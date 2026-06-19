const CACHE_NAME = 'toolhub-pro-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/css/responsive.css',
  './assets/js/app.js',
  './assets/js/theme.js',
  './assets/js/storage.js',
  './assets/js/search.js',
  './components/header.js',
  './components/footer.js',
  './data/tools.json',
  './assets/images/logo-icon.png',
  './assets/images/logo.png',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png',
  './assets/images/favicon.ico'
];

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-while-revalidate strategy
self.addEventListener('fetch', event => {
  // Only handle GET requests and local scope
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchedResponse = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Silent catch for network failure
        });
        
        return cachedResponse || fetchedResponse;
      });
    })
  );
});
