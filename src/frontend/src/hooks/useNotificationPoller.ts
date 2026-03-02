/**
 * useNotificationPoller
 *
 * Wraps useMyNotifications and fires native phone notifications
 * for each newly arrived unread notification. Uses a seenIds ref
 * to track which notifications have already been shown — avoids
 * spamming the user on first load or when tab is refocused.
 *
 * This hook should be called ONCE at the Layout level.
 */
import { useEffect, useRef } from "react";
import {
  getNotifContent,
  showNativeNotification,
} from "./usePushNotifications";
import { useMyNotifications } from "./useQueries";

export function useNotificationPoller() {
  const { data: notifications, ...rest } = useMyNotifications();

  // Track which notification IDs we've already shown a native alert for.
  // Initialized lazily — on first load we populate it with ALL current IDs
  // so we don't flood the user with old notifications.
  const seenIds = useRef<Set<string> | null>(null);
  // Track whether we've done the first-load init
  const initialized = useRef(false);

  useEffect(() => {
    if (!notifications) return;

    // First load: initialise seenIds with all existing notification IDs
    // so we only fire for future arrivals, not everything on open.
    if (!initialized.current) {
      seenIds.current = new Set(notifications.map((n) => n.id));
      initialized.current = true;
      return;
    }

    // Subsequent polls: find new notifications not previously seen
    const seen = seenIds.current ?? new Set<string>();
    const newUnread = notifications.filter((n) => !n.isRead && !seen.has(n.id));

    for (const notif of newUnread) {
      // Mark as seen immediately to prevent duplicate firing
      seen.add(notif.id);

      // Determine target URL for tapping the notification
      let url = "/notifications";
      if (notif.notifType === "message") url = "/messages";
      else if (notif.notifType === "comment" && notif.relatedId)
        url = `/?postId=${notif.relatedId}`;
      else if (notif.notifType === "follow" && notif.relatedId)
        url = `/profile/${notif.relatedId}`;

      const { title, body } = getNotifContent(notif.notifType, notif.message);
      showNativeNotification(title, body, {
        tag: `revspace-${notif.notifType}-${notif.id}`,
        url,
      });
    }

    // Also add any already-read notifications to seenIds so they don't fire later
    for (const notif of notifications) {
      seen.add(notif.id);
    }

    seenIds.current = seen;
  }, [notifications]);

  return { data: notifications, ...rest };
}
