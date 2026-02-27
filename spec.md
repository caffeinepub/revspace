# RevSpace

## Current State
- MessagesPage shows conversations using truncated Principal IDs (e.g. "xk3ab...1f23") instead of display names
- Sending a new message does NOT create a notification for the recipient
- FeedPage renders posts in the order returned by `getAllPosts()` — newest posts appear at the bottom unless the backend already returns them sorted descending
- NotificationsPage handles like/comment/follow/message types but does not handle new inbound message notifications specifically

## Requested Changes (Diff)

### Add
- When a message is sent, fire a notification to the recipient with type `"message"` and a text like `"<senderName> sent you a message"`
- In MessagesPage, look up the display name of each conversation partner via `getProfile(principal)` and show it instead of the truncated principal

### Modify
- MessagesPage `ConversationList` and `ChatView` headers: resolve and display the other user's `displayName` (falling back to truncated principal if no profile set)
- FeedPage: sort `displayPosts` by `createdAt` descending so newest posts are always at the top
- `useSendMessage` mutation: after success, call `sendNotificationToUser` for the receiver with type `"message"` and a message string that includes the sender's display name

### Remove
- Nothing removed

## Implementation Plan
1. **MessagesPage** -- Create a small helper component `ConversationItem` that calls `useGetProfile(principal)` and renders the resolved display name + avatar. Use it in `ConversationList` and in the `ChatView` header.
2. **FeedPage** -- After loading posts, sort by `createdAt` descending before rendering: `[...displayPosts].sort((a, b) => Number(b.createdAt - a.createdAt))`
3. **Message notification** -- In `useSendMessage` (useQueries.ts), after success invalidate queries as before AND call `actor.sendNotificationToUser(receiver, "message", "<principal> sent you a message", "")`. Since we don't easily have the sender display name in the hook, use the short principal. Alternatively, wire it in `MessagesPage` ChatView after the `sendMessage` success by also calling `useSendNotificationToUser`.
4. Wire the notification send in `ChatView.handleSend`: on success, also mutate `useSendNotificationToUser` with `{ targetUser: recipient, notifType: "message", message: "${senderDisplayName} sent you a message", relatedId: "" }`.
