// RevSpace Service Worker
// Handles PWA caching and native notification click routing

const CACHE_NAME = "revspace-v1";

// On install — skip waiting to activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// On activate — claim all clients
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event — show notification from payload
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

// Notification click — focus or open the app at the target URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if ("focus" in client) {
            try {
              const clientUrl = new URL(client.url);
              const targetFullUrl = new URL(targetUrl, self.location.origin);
              if (clientUrl.origin === targetFullUrl.origin) {
                return client.navigate(targetFullUrl.href).then((c) => c && c.focus());
              }
            } catch {
              // ignore URL parse errors
            }
          }
        }
        // No existing window — open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
