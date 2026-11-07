/* Service worker — Bus 132 · Ledru Rollin
   Rend l'app installable et utilisable hors-ligne.
   Stratégie : RÉSEAU D'ABORD pour la coquille (la page reste toujours à jour quand tu es en ligne),
   cache seulement en secours hors-ligne. Les appels API PRIM ne sont jamais mis en cache. */
const CACHE = "trajets-idf-v3";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () {})
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var u;
  try { u = new URL(e.request.url); } catch (err) { return; }
  // Temps réel : on laisse filer au réseau, jamais de cache.
  if (u.hostname.indexOf("iledefrance-mobilites") >= 0) return;
  if (e.request.method !== "GET") return;
  if (u.origin !== self.location.origin) return;  // ressources tierces : réseau direct
  // Réseau d'abord : page à jour quand en ligne, cache en secours sinon.
  e.respondWith(
    fetch(e.request).then(function (resp) {
      if (resp && resp.status === 200) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return resp;
    }).catch(function () {
      return caches.match(e.request).then(function (hit) {
        return hit || caches.match("./index.html");
      });
    })
  );
});
