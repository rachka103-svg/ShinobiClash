/**
 * Shinobi Strike — Service Worker
 *
 * Caches the app shell, static artwork/UI assets, and game images (WebP/PNG)
 * for offline-capable, instant-loading PWA behavior. API requests (player
 * progression, currencies, battle results, summons) are ALWAYS passed through
 * to the network — never cached — so the server stays authoritative for all
 * mutable game state.
 */

const CACHE_VERSION = "shinobi-v2";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const IMG_CACHE = `${CACHE_VERSION}-img`;

// App shell — the HTML document and core JS/CSS bundles.
// In dev (react-scripts) these are served as unhashed paths so we cache
// the document + static assets; hashed chunks are cached on first fetch.
const SHELL_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon-32.png",
  "/icon-192.png",
  "/icon-512.png",
];

// Assets that should be cache-first (images, fonts).
const IMG_EXTENSIONS = [".webp", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET.
  if (req.method !== "GET") return;

  // NEVER cache API calls — server-authoritative game state.
  if (url.pathname.startsWith("/api/") || url.pathname.includes("/api/")) return;

  // Skip cross-origin requests (analytics, fonts CDN) — let the browser handle them.
  if (url.origin !== self.location.origin) return;

  // Image assets — cache-first with background revalidation.
  if (IMG_EXTENSIONS.some((ext) => url.pathname.endsWith(ext))) {
    event.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        // Revalidate in background.
        fetch(req).then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
        }).catch(() => {});
        if (cached) return cached;
        const res = await fetch(req);
        if (res.status === 200) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // HTML documents — network-first (so updates are picked up), fall back to cache.
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("/")))
    );
    return;
  }

  // Static JS/CSS chunks — stale-while-revalidate.
  if (url.pathname.startsWith("/static/") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req).then((res) => {
          if (res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }
});
