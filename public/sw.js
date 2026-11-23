// Scelta Makeup — Service Worker pass-through (zero caching su API, admin e dati dinamici)

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        // Ignora eventuali errori di pulizia cache legacy
      }
      await self.clients.claim();
    })()
  );
});

// Nessuna intercettazione/cache in fetch: tutte le richieste restano 100% network-only.
self.addEventListener("fetch", () => {
  // Pass-through nativo del browser
});
