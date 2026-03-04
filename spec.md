# RevSpace

## Current State
- AdminPage blocks on `isAdmin === null || isFetching` where `isFetching` comes from `useActor`. If `_initializeAccessControlWithSecret` is slow (common after a deploy), this causes a permanent black/loading screen until the 5s timeout fires.
- After the 5s timeout, `isAdmin` falls to `false` and the token gate is shown — user has to re-enter token even if `rs_admin_unlocked` is set in localStorage.
- The admin auth check happens in a `useEffect` that depends on `isFetching` — if `isFetching` is still `true` when the effect runs (race), the effect returns early and `isAdmin` never gets set from localStorage, causing the auth gate to show even for returning admins.
- Admin actions (Give Pro, Add RevBucks) call `adminUpdateUserLocation` which requires an **authenticated** actor. If the actor hasn't resolved yet or the admin panel used an anonymous actor, these calls fail silently.

## Requested Changes (Diff)

### Add
- Dedicated `useEffect` that checks localStorage immediately on mount (no actor dependency) — if `rs_admin_unlocked === "Meonly123$"` set `isAdmin = true` instantly.
- After actor is ready, also confirm with `isCallerAdmin()` as a secondary check.

### Modify
- Remove `isFetching` from the AdminPage loading gate — only block on `isAdmin === null` (the 5s safety timeout already covers this).
- Fix the auth-check `useEffect` to run the localStorage check immediately regardless of `isFetching`.
- The admin `UsersTab` should show an error/retry button if `adminGetAllProfiles` fails, instead of silently staying empty.
- Ensure admin write actions (Pro toggle, Add RB) display clear error messages so the admin knows if the call failed due to actor not being ready.

### Remove
- The `isFetching` dependency on the loading spinner in AdminPage — it creates a deadlock.

## Implementation Plan
1. In `AdminPage`, separate the localStorage check from the actor check — run it synchronously on mount.
2. Change loading gate from `isAdmin === null || isFetching` to just `isAdmin === null`.
3. In `UsersTab`, add a retry button when loading fails.
4. Ensure admin action errors are clearly toasted with actionable messages.
