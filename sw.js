var CACHE = 'conjugar-v1-mw7ygmbc';
var SHELL = ['./', 'index.html', 'engine.js', 'data.js', 'tr.js', 'syn.js', 'app.js', 'wsent.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return Promise.all(SHELL.map(function (u) { return fetch(new Request(u, { cache: 'reload' })).then(function (r) { if (!r.ok) throw new Error(u); return c.put(u, r); }); })); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE && k.indexOf('conjugar-') === 0; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req.url, { cache: 'no-cache' }).then(function (res) { if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); } return res; }).catch(function () { return hit; });
      return hit || net;
    }));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(function (c) { return c.match(req).then(function (hit) { var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(function () { return hit; }); return hit || net; }); }));
  }
});
