// Service worker de GameWin : met en cache la coquille de l'application
// (page, icônes, manifest) pour un chargement instantané et un fonctionnement
// hors-ligne. Les échanges avec Firebase/Firestore (autre domaine) ne sont
// jamais interceptés ici : ils passent toujours normalement par le réseau.
const CACHE_NAME = "gamewin-shell-v1";
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // On ne gère que nos propres requêtes GET (jamais Firebase/Firestore ni les
  // domaines externes), pour ne jamais perturber le jeu en ligne.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      // Réponse immédiate depuis le cache si dispo (rapide + fonctionne hors-ligne),
      // avec mise à jour silencieuse en arrière-plan pour la prochaine visite.
      return cached || network;
    })
  );
});
