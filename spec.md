# RevSpace

## Current State
Feed posts disappear after every deploy because the ICP canister actor (both `useActor` and `usePublicActor`) can take several seconds to initialize after a fresh publish. During that window, `useGetAllPosts` returns `[]`, which renders as "No posts" or a spinning skeleton — even though posts exist on-chain.

## Requested Changes (Diff)

### Add
- `src/frontend/src/lib/postCache.ts` — localStorage backup cache for feed posts. Writes the full post array after every successful `getAllPosts` call. Reads it back immediately on next load so the feed has content before the actor resolves. Entries older than 48 hours are discarded.
- `initialData` / `initialDataUpdatedAt` on `useGetAllPosts` — pre-populates the React Query cache from localStorage on mount so posts appear with zero delay.

### Modify
- `useGetAllPosts` — `enabled: true` always (was `enabled: !!actor`) so the query fires immediately and serves cache while actor initializes. Adds `refetchInterval: 2000` when actor is null so it keeps retrying until live data arrives. On success, writes posts to `postCache`.
- `usePublicActor` — more aggressive retry (`retry: 10`, `retryDelay` capped at 4s) and `refetchInterval` that keeps polling at 1.5s until the actor resolves, then stops.
- `FeedPage` — uses cached posts as immediate fallback when `actorLoading` and live posts are empty. Skeleton and "Loading members…" only show when there's truly nothing to display (no live posts AND no cache). Member count derived from `displayPosts` (includes cached).

### Remove
- Nothing removed.

## Implementation Plan
1. Create `postCache.ts` with `getCachedPosts` / `setCachedPosts` helpers.
2. Import `getCachedPosts` / `setCachedPosts` in `useQueries.ts`.
3. Refactor `useGetAllPosts` to always be enabled, use `initialData` from cache, write cache on success, and poll until actor is available.
4. Tighten `usePublicActor` retry/polling config.
5. Update `FeedPage` to blend live + cached posts and suppress false "Loading members" / skeletons when cache has content.
