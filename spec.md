# RevSpace

## Current State
- Admin Panel link is conditionally appended inside the "Info" nav group when `isAdmin` is true, in both Sidebar and MobileNav in Layout.tsx. The `isAdmin` hook calls `actor.isCallerAdmin()` asynchronously. If the actor is slow to initialize or the call fails silently, `isAdmin` stays false and the link never appears. The nav groups are a `const` array so the Info group always exists, but the admin link appended below it depends entirely on the async result.
- GamePage.tsx embeds the Street Legends game via iframe for Pro users. Non-Pro users see a locked promo page. There is no sign-in prompt or Internet Identity link on the page — the user wants a sign-in call-to-action for logged-out/anonymous users that uses Internet Identity (which they don't control), so access can't be bypassed without Pro.

## Requested Changes (Diff)

### Add
- On the GamePage non-Pro view: detect if the user is not logged in (anonymous identity) and show a "Sign in with Internet Identity" button (using the `login` function from `useInternetIdentity`) above or instead of the upgrade prompt. The sign-in CTA makes clear that signing in is required first, then Pro is needed to access the game. This uses ICP's native Internet Identity — not controlled by the app owner — so it cannot be bypassed.
- A clear two-step gate on GamePage: Step 1 = sign in via Internet Identity (if not logged in), Step 2 = upgrade to Pro (if logged in but not Pro).

### Modify
- Admin Panel nav link: replace the async-only approach with a more reliable pattern. Move admin detection so it also stores the result in localStorage as a persistent cache, and renders immediately from cache while the async check runs in background. This prevents the link from vanishing if the actor is slow. Additionally, add a direct `/admin` route note so even if nav fails the user can navigate directly.
- Layout.tsx `useIsAdmin` hook: persist `isAdmin` result to localStorage under a key tied to the principal, and initialize state from localStorage so the link appears instantly on subsequent page loads.

### Remove
- Nothing removed.

## Implementation Plan
1. Update `useIsAdmin` hook in Layout.tsx to read from localStorage on mount (keyed by principal) and write back when the async result arrives — so the Admin Panel link shows immediately for known admins.
2. Update GamePage.tsx to import `useInternetIdentity` and check if the identity is anonymous. Show a sign-in screen (Step 1) for logged-out users before the Pro lock screen (Step 2), using the `login()` function from the hook.
