// RevSpace Service Worker v2
// Handles PWA caching, media caching, and native notification click routing

const CACHE_NAME = "revspace-v2-media";
// Maximum total size to keep in the media cache (in bytes — 80 MB)
const MAX_CACHE_SIZE_BYTES = 80 * 1024 * 1024;

// ── Install — skip waiting to activate immediately ────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// ── Activate — clear old caches, claim all clients ───────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Delete any old revspace-v1 caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("revspace-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// ── Fetch — smart caching strategy based on request type ─────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept ICP canister/API calls — always go to network
  const isCanisterCall =
    url.hostname.endsWith(".icp0.io") ||
    url.hostname.endsWith(".ic0.app") ||
    url.hostname.endsWith(".raw.icp0.io") ||
    url.hostname.includes("icp-api") ||
    url.pathname.startsWith("/api/");

  if (isCanisterCall) return; // Let the request pass through unmodified

  // ── Static assets under /assets/ → Cache-First (7-day TTL) ───────────────
  const isStaticAsset =
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/uploads/");

  if (isStaticAsset && event.request.method === "GET") {
    event.respondWith(cacheFirstWithTTL(event.request, 7 * 24 * 60 * 60));
    return;
  }

  // ── Video/media blobs → Stale-While-Revalidate ────────────────────────────
  const isMediaBlob =
    url.hostname.includes("blob.caffeine.ai") ||
    url.hostname.includes("storage.caffeine.ai") ||
    url.pathname.endsWith(".mp4") ||
    url.pathname.endsWith(".webm") ||
    url.pathname.endsWith(".mov");

  if (isMediaBlob && event.request.method === "GET") {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // ── All other requests → Network only (don't cache canister calls, auth, etc.)
  // Don't intercept — fall through to browser's default behavior
});

// ── Cache-First strategy with TTL ────────────────────────────────────────────
async function cacheFirstWithTTL(request, maxAgeSeconds) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    // Check if the cached response is still fresh
    const cachedDate = cached.headers.get("sw-cached-at");
    if (cachedDate) {
      const age = (Date.now() - parseInt(cachedDate, 10)) / 1000;
      if (age < maxAgeSeconds) {
        return cached;
      }
    } else {
      // No timestamp — treat as fresh (legacy cache entry)
      return cached;
    }
  }

  // Cache miss or stale — fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Clone the response and add a timestamp header before caching
      const responseToCache = addTimestampHeader(networkResponse.clone());
      await cache.put(request, responseToCache);
      // Evict oldest entries if cache is too large
      await enforceCacheLimit(cache);
    }
    return networkResponse;
  } catch {
    // Network failed — return stale cache if available
    if (cached) return cached;
    throw new Error("Network error and no cached response available");
  }
}

// ── Stale-While-Revalidate strategy ──────────────────────────────────────────
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Kick off a background update
  const networkFetch = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const responseToCache = addTimestampHeader(response.clone());
        await cache.put(request, responseToCache);
        await enforceCacheLimit(cache);
      }
      return response;
    })
    .catch(() => null);

  // Return cached immediately if available, otherwise wait for network
  if (cached) return cached;
  const networkResponse = await networkFetch;
  if (networkResponse) return networkResponse;
  throw new Error("Network error and no cached response for media");
}

// ── Add a custom timestamp header to a response ───────────────────────────────
function addTimestampHeader(response) {
  const headers = new Headers(response.headers);
  headers.set("sw-cached-at", String(Date.now()));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ── Enforce cache size limit by evicting oldest entries ───────────────────────
async function enforceCacheLimit(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length === 0) return;

    // Get sizes and timestamps for all cached entries
    const entries = await Promise.all(
      keys.map(async (request) => {
        const response = await cache.match(request);
        const cachedAt = parseInt(
          response?.headers.get("sw-cached-at") ?? "0",
          10,
        );
        const contentLength = parseInt(
          response?.headers.get("content-length") ?? "0",
          10,
        );
        return { request, cachedAt, size: contentLength };
      }),
    );

    // Calculate total size
    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    if (totalSize <= MAX_CACHE_SIZE_BYTES) return;

    // Sort by oldest first (ascending cachedAt)
    entries.sort((a, b) => a.cachedAt - b.cachedAt);

    // Evict until under limit
    let currentSize = totalSize;
    for (const entry of entries) {
      if (currentSize <= MAX_CACHE_SIZE_BYTES * 0.8) break; // Stop at 80% of limit
      await cache.delete(entry.request);
      currentSize -= entry.size;
    }
  } catch {
    // Cache eviction is best-effort — never block the response
  }
}

// ── Push event — show notification from payload ───────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "RevSpace", body: event.data ? event.data.text() : "" };
  }

  const { title = "RevSpace", body = "", icon, tag, url } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || "/assets/generated/favicon-revspace.dim_512x512.png",
      badge: "/assets/generated/favicon-revspace.dim_512x512.png",
      tag: tag || "revspace-notif",
      data: { url: url || "/" },
      vibrate: [200, 100, 200],
    }),
  );
});

// ── Notification click — focus or open the app at the target URL ──────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            try {
              const clientUrl = new URL(client.url);
              const targetFullUrl = new URL(targetUrl, self.location.origin);
              if (clientUrl.origin === targetFullUrl.origin) {
                return client
                  .navigate(targetFullUrl.href)
                  .then((c) => c && c.focus());
              }
            } catch {
              // ignore URL parse errors
            }
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
