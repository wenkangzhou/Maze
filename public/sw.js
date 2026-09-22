const CACHE_PREFIX = "maze-kids";
const CACHE_VERSION = "v1";
const CORE_CACHE = `${CACHE_PREFIX}-core-${CACHE_VERSION}`;
const PAGE_CACHE = `${CACHE_PREFIX}-pages-${CACHE_VERSION}`;
const ASSET_CACHE = `${CACHE_PREFIX}-assets-${CACHE_VERSION}`;
const CORE_ASSETS = [
  "/",
  "/offline/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CORE_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const currentCaches = new Set([CORE_CACHE, PAGE_CACHE, ASSET_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(`${CACHE_PREFIX}-`) && !currentCaches.has(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function canCache(response) {
  return response.ok && (response.type === "basic" || response.type === "default");
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map((key) => cache.delete(key)));
}

async function cacheResponse(cacheName, request, response) {
  if (!canCache(response)) return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  await trimCache(cacheName, cacheName === PAGE_CACHE ? 120 : 220);
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    await cacheResponse(PAGE_CACHE, request, response);
    return response;
  } catch {
    return (
      (await caches.match(request, { ignoreVary: true })) ??
      (await caches.match(new URL(request.url).pathname, { ignoreVary: true })) ??
      (await caches.match("/offline/"))
    );
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  await cacheResponse(ASSET_CACHE, request, response);
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|json|png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname);
  if (isStaticAsset) event.respondWith(cacheFirstAsset(request));
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_URLS" || !Array.isArray(event.data.urls)) return;
  const pageUrl = event.data.pageUrl;
  const urls = event.data.urls.filter((value) => {
    try {
      return new URL(value, self.location.origin).origin === self.location.origin;
    } catch {
      return false;
    }
  });
  event.waitUntil(
    Promise.allSettled(
      urls.map(async (value) => {
        const request = new Request(value, { credentials: "same-origin" });
        const response = await fetch(request);
        await cacheResponse(
          value === pageUrl ? PAGE_CACHE : ASSET_CACHE,
          request,
          response
        );
      })
    )
  );
});
