/* Power Card — Vote or Fade Away: offline service worker.
   Strategy: navigations are network-first (online players always get the
   freshest build; the cache is refreshed on every successful load) with a
   cache fallback, so after ANY one successful online load the game plays
   fully offline — camp rules. Google Fonts are cache-first (immutable
   files). Everything else (YouTube, vote.gov) is never intercepted. */
var CACHE = 'power-card-v1';
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  var isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (e.request.mode === 'navigate' || (e.request.method === 'GET' && url.origin === self.location.origin && !isFont)) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () {
        return caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
          return hit || caches.match('index.html', { ignoreSearch: true });
        });
      })
    );
    return;
  }
  if (isFont && e.request.method === 'GET') {
    e.respondWith(
      caches.match(e.request).then(function (hit) {
        return hit || fetch(e.request).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          return res;
        });
      })
    );
  }
});
