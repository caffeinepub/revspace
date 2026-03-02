# RevSpace

## Current State
Notification and message badge counts are driven by `useNotificationPoller` in Layout, which polls every 60s. The badge shows the count of unread notifications. Visiting the notifications page does NOT auto-clear the badge — it only clears if the user manually clicks "Mark all read" or clicks each notification. Visiting the messages page also does NOT mark message-type notifications as read, so the message badge never clears on its own.

## Requested Changes (Diff)

### Add
- Auto-mark-all-read behavior when the Notifications page mounts (clear all unread notifications automatically on page open)
- Auto-mark message-type notifications as read when the Messages page mounts (or when a conversation is opened), so the message badge clears

### Modify
- `NotificationsPage.tsx`: On mount, automatically call markRead for all unread notifications so the badge clears immediately when the user visits the page
- `MessagesPage.tsx`: On mount (and when a conversation is selected), automatically mark all unread message-type notifications as read so the message badge clears
- Both pages should also immediately invalidate/refetch the notifications query so the badge in the nav bar updates without waiting for the 60s polling interval

### Remove
- Nothing removed

## Implementation Plan
1. In `NotificationsPage`: use a `useEffect` that fires when `notifications` data is available on mount; bulk-mark all unread notifications as read; immediately invalidate the `["notifications"]` query key so the Layout badge reflects the change without waiting for the poll
2. In `MessagesPage`: use a `useEffect` that fires on mount; find all unread notifications with `notifType === "message"` and mark them all read; invalidate the `["notifications"]` query immediately
3. Ensure the effects only run once on mount (not on every re-render) using a `useRef` flag so we don't spam the backend on every poll refresh
