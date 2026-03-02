# RevSpace

## Current State
Full-featured car enthusiast social platform. After v138, users report everything still throwing error messages — feed not loading, reels not loading, profiles not showing username/pic/reels.

The actor initialization chain is:
1. `useActor` builds the actor and immediately calls `_initializeAccessControlWithSecret(adminToken)` inside its React Query `queryFn`.
2. `useRegisteredActor` wraps `useActor` and calls `_initializeAccessControlWithSecret("")` again in a `useEffect`, then waits 200ms before setting `isRegistered = true`.
3. All queries are gated on `!!actor && !isFetching`.

The `useDeployGuard` hook invalidates the actor query on every new 5-minute window AND removes all cached query data.

## Requested Changes (Diff)

### Add
- Force an explicit `syncTime()` call on the HttpAgent inside `useActor`'s `queryFn`, BEFORE calling `_initializeAccessControlWithSecret`. This ensures the agent clock is synced with the replica after every deploy.
- Add a `shouldSyncTime: true` option to the HttpAgent creation in `useActor`.

### Modify
- In `useActor`, wrap the `_initializeAccessControlWithSecret` call in a try/catch with retry logic (up to 3 attempts with 1s delay) so transient post-deploy errors don't leave the actor in a broken state forever.
- In `useActor`, after building the actor, call `syncTime()` on the agent if available, before calling `_initializeAccessControlWithSecret`. Use `(actor as any)._agent?.syncTime?.()` or similar pattern to reach the agent.
- In `useRegisteredActor`, increase the post-registration delay from 200ms to 500ms to give the canister more time to process the role after a cold-start.
- In `useDeployGuard`, instead of `removeQueries` (which wipes ALL cached data including valid query results), use `invalidateQueries` only, so queries refetch in the background rather than showing loading states immediately.
- In `useActor`, set `retry: 3` and `retryDelay` on the query config so the actor rebuild retries on failure.

### Remove
- Nothing removed.

## Implementation Plan
1. Edit `useActor.ts`:
   - Add `retry: 3`, `retryDelay` to the useQuery config.
   - Inside `queryFn`, after creating the actor with `createActorWithConfig`, attempt to sync the agent's clock via `(actor as any)._agent?.syncTime?.()` — wrap in try/catch.
   - Wrap the `_initializeAccessControlWithSecret(adminToken)` call in a retry loop (3 attempts, 1s apart).
2. Edit `useRegisteredActor.ts`:
   - Increase the post-registration delay from 200ms to 500ms.
3. Edit `useDeployGuard.ts`:
   - Replace `queryClient.removeQueries(...)` with `queryClient.invalidateQueries(...)` so data is refetched in background rather than showing blank/loading immediately.
4. Verify TypeScript compiles cleanly.
