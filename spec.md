# RevSpace

## Current State
After each Caffeine deploy/publish, the ICP HttpAgent clock in `useActor` becomes stale. Since `staleTime: Infinity` prevents the actor from refreshing, every backend call (post creation, file uploads) fails with "Expected v3 response body" / ingress-expiry certificate errors. Posts and uploads stop working until the user manually clears their browser cache or waits for a new session.

## Requested Changes (Diff)

### Add
- `useDeployGuard` hook (`src/frontend/src/hooks/useDeployGuard.ts`) — detects when the app loads in a new 5-minute time bucket (indicating a fresh deploy or session) and invalidates the actor query so it rebuilds with a freshly synced clock
- `DeployGuard` component wired into `App.tsx` — runs once on app mount before any canister calls

### Modify
- `App.tsx` — import and mount `DeployGuard` component at the root

### Remove
- Nothing

## Implementation Plan
1. Create `useDeployGuard.ts` that uses `sessionStorage` to track 5-minute time buckets and invalidates the actor React Query key when a new bucket is detected
2. Wire `DeployGuard` into `App.tsx` as the first child component
3. Verify build passes
