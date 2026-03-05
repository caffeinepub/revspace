# RevSpace

## Current State
The app has a recurring loading failure where the feed, reels, and profile do not load (blank/spinner) after a deploy or on first visit. Root cause: `usePublicActor` builds the anonymous actor inside a React Query `queryFn`, which means it is async and dependent on the React Query lifecycle. When the query hasn't resolved yet, every downstream query (`useGetAllPosts`, `useGetProfile`, etc.) either returns stale empty data or spins on retry loops. Multiple competing retry intervals (publicActor polling 800ms, posts polling 1000ms, authActor invalidating, registeredActor invalidating) all hammer the canister simultaneously, causing slowness and unresponsiveness.

## Requested Changes (Diff)

### Add
- A module-level singleton for the public actor that is created once eagerly (synchronously triggered on module import) so it is available before any React component renders
- A `getPublicActor()` utility function that returns the singleton, waiting for it if it hasn't resolved yet
- A simple React hook `usePublicActorInstance()` that returns the singleton (no React Query, no polling, no retry loops)

### Modify
- `usePublicActor.ts` — replace the React Query-based approach with a direct reference to the module singleton; no more `refetchInterval`, no more 20 retries, no React Query overhead for actor creation
- `useQueries.ts` `useGetAllPosts` — remove `refetchInterval: !actor ? 1_000 : false` (the constant polling hammers the canister); rely on `retry` and `refetchOnMount` instead; increase `staleTime` to 60s to reduce redundant fetches
- `ReelsPage.tsx` — remove the `actorLoading = !publicActor` gate that blocks all reel rendering; show reels as soon as `posts` data arrives regardless of actor state
- `FeedPage.tsx` — tighten the `actorLoading` check so it only shows skeleton when there is truly no data at all (neither live nor cached)

### Remove
- The `refetchInterval` on `useGetAllPosts` that fires every 1 second when actor is null (this is the primary source of canister hammering and sluggishness)
- The aggressive retry (20 retries) on `usePublicActor` since the singleton approach makes it unnecessary

## Implementation Plan
1. Rewrite `usePublicActor.ts` to use an eagerly-initialized module singleton instead of React Query
2. Update `useGetAllPosts` in `useQueries.ts` to remove the per-second polling interval
3. Update `ReelsPage.tsx` to decouple the loading gate from actor state
4. Update `FeedPage.tsx` actorLoading logic to be less aggressive
