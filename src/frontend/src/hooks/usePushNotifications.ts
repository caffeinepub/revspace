/**
 * usePushNotifications
 *
 * Registers the RevSpace service worker and exposes helpers for
 * requesting notification permission and firing native notifications.
 *
 * Architecture note: ICP canisters cannot call external push services,
 * so we use the browser Notifications API directly. Notifications are
 * triggered in the frontend whenever new unread notifications arrive
 * from the polling cycle in useMyNotifications.
 */

// VAPID public key (informational — kept here for future Web Push upgrade)
// Public:  BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
// Private: (server-side only — not used in frontend)

const SW_PATH = "/sw.js";

/** Register the service worker once per page load. Safe to call multiple times. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: "/",
    });
    return registration;
  } catch {
    return null;
  }
}

/** Request notification permission. Returns the resulting permission state. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export interface NativeNotificationOptions {
  icon?: string;
  tag?: string;
  url?: string;
}

/**
 * Fire a native notification via the Notifications API.
 * If a service worker registration is available, uses showNotification
 * so it works even when the page is in the background.
 */
export function showNativeNotification(
  title: string,
  body: string,
  options: NativeNotificationOptions = {},
): void {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const icon =
    options.icon || "/assets/generated/favicon-revspace.dim_512x512.png";
  const tag = options.tag || "revspace-notif";
  const url = options.url || "/";

  // Store the target URL so the app can navigate on next open
  if (options.url) {
    try {
      localStorage.setItem("rs_notif_last_url", options.url);
    } catch {
      // ignore
    }
  }

  // Prefer service worker notification (works in background)
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready
      .then((registration) => {
        return registration.showNotification(title, {
          body,
          icon,
          badge: icon,
          tag,
          data: { url },
        });
      })
      .catch(() => {
        // Fallback to foreground notification
        try {
          new Notification(title, { body, icon, tag });
        } catch {
          // ignore
        }
      });
  } else {
    // Foreground notification
    try {
      new Notification(title, { body, icon, tag });
    } catch {
      // ignore
    }
  }
}

/** Get human-readable title/body for each notification type. */
export function getNotifContent(
  notifType: string,
  message?: string,
): { title: string; body: string } {
  switch (notifType) {
    case "message":
      return {
        title: "New Message on RevSpace 💬",
        body: message || "You have a new message",
      };
    case "like":
      return {
        title: "Someone liked your post ❤️",
        body: message || "Your post got a new like",
      };
    case "comment":
      return {
        title: "New comment on your post 💬",
        body: message || "Someone commented on your post",
      };
    case "follow":
      return {
        title: "New follower on RevSpace 🔥",
        body: message || "Someone started following you",
      };
    case "post":
      return {
        title: "New post from someone you follow 🚗",
        body: message || "Check out the latest post",
      };
    default:
      return {
        title: "RevSpace Notification",
        body: message || "You have a new notification",
      };
  }
}
