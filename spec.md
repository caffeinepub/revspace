# RevSpace

## Current State
- Full social platform with posts, reels, comments, likes, DMs, notifications, marketplace, clubs, events, admin panel
- Admin panel has Users tab that reads from `adminGetAllProfiles()` and overlays role data from `adminGetAllUsers()`
- RevBucks, Pro status, and Model status are encoded in the profile `location` field (via `encodeMetaToLocation` / `decodeMetaFromLocation`)
- Admin RB/Pro changes currently show in the UI but cannot persist — there is NO `adminUpdateUserLocation` backend function; the code checks for it at runtime and falls back to a toast warning asking the user to re-save their profile in Settings
- Push notifications exist as in-app notifications only; no Web Push (browser/phone) support

## Requested Changes (Diff)

### Add
- `adminUpdateUserLocation(user: Principal, newLocation: Text)` — admin-only backend function that directly writes the `location` field of a target user's profile; this is the missing piece that makes admin RB and Pro changes persist on-chain immediately without the user re-saving
- Web Push notification support on the frontend:
  - On first login (after identity is established), prompt user to enable push notifications
  - Register a service worker (`/sw.js`) that handles `push` events and shows native phone notifications
  - Save the push subscription (JSON string) to localStorage keyed by principal
  - On the backend, store VAPID push subscriptions per user in the notifications map (using a new type or a separate map)
  - Trigger push dispatch from the frontend (via a helper function) when a notification is created for the current user's contacts: new chat, new like, new post from followed users, new comment on their posts
  - Push notification categories: "message" (new chat), "like", "comment", "post" (new post by followed user)

### Modify
- `adminUpdateUserLocation` wired into the admin panel Users tab so that Add RB and Give/Remove Pro calls immediately use the real backend function instead of the local-only fallback
- Service worker installed at `/sw.js` via `public/sw.js` in the frontend public folder
- VAPID keys generated and hardcoded (public key in frontend, private key for backend HTTP outcall signing)

### Remove
- The toast warning telling admin users to ask recipients to re-save their profile (once `adminUpdateUserLocation` is live)

## Implementation Plan
1. Add `adminUpdateUserLocation(user: Principal, newLocation: Text)` to Motoko backend — admin-only, updates the `location` field of the named user's stored profile
2. Regenerate backend bindings (`backend.d.ts`) to expose the new function
3. Add `public/sw.js` service worker to frontend with push event handler
4. Add push notification registration flow in `App.tsx` or a dedicated hook (`usePushNotifications.ts`) — fires after user logs in, requests permission, subscribes, saves subscription to localStorage
5. Update `AdminPage.tsx` — `handleAddRb` and `handleProToggle` now call `actor.adminUpdateUserLocation(...)` directly (no fallback toast)
6. Wire push dispatch: after `likePost`, `addComment`, `sendMessage`, and `createPost` succeed, check if affected user has a push subscription and fire a Web Push notification via the frontend push helper (since ICP cannot do HTTP outcalls to push services directly, the sending user's browser sends the push on behalf of the action)
