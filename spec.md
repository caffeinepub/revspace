# RevSpace

## Current State
Full car enthusiast social platform with Feed, Reels, Garage, Events, Marketplace, Clubs, Leaderboard, Shop, Messages, Notifications, Profile, and Settings pages. Backend uses stable storage for all data (profiles, posts, reels, messages, etc.). Frontend uses Internet Identity for auth.

## Requested Changes (Diff)

### Add
- Auto-detect already-authenticated returning users on the LoginScreen and bypass the ICP popup immediately
- On the LoginScreen, if the user's identity is already valid (from local storage), the "Login to Site" button should instantly pass them through without showing the ICP popup

### Modify
- `LoginScreen.tsx`: Check if identity already exists when component mounts; if so, call `onLoginSuccess` immediately (skip the ICP popup). Show a "Continue" button state for already-authenticated users vs "Login to Site" for new logins
- `App.tsx` `AuthGate`: Improve logic so that when `identity` is already present at init time (returning user), `onLoginSuccess` is triggered correctly even before the button is clicked
- `useInternetIdentity.ts` `login()`: Currently errors with "User is already authenticated" for returning users -- the LoginScreen should detect this case and skip calling `login()` entirely

### Remove
- Nothing removed

## Implementation Plan
1. In `LoginScreen.tsx`: Read `identity` from `useInternetIdentity`. If `identity` already exists (returning user), show a "Continue" button that just calls `onLoginSuccess()` directly (no ICP popup). If no identity, show the normal "Login to Site" button that calls `login()`.
2. In `App.tsx` `AuthGate`: The `loggedInThisLoad` approach is fine. Ensure the initial `useEffect` in `LoginScreen` still handles the case where identity becomes available after the component mounts.
3. This ensures returning users don't get stuck and their saved profile/data loads correctly from the backend stable storage.
