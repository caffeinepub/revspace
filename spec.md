# RevSpace

## Current State
- Feed page shows "Loading members..." indefinitely — `actorLoading` checks `isFetching` on both actor hooks, which stays `true` on every background refetch triggered by `invalidateQueries` after auth changes
- Login/intro page background shows broken image — references old path `/assets/uploads/images-3--1.jpeg` which no longer resolves

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- `FeedPage.tsx`: Change `actorLoading` logic from `isFetching || isFetching` to `!actor && !actor` — only true when BOTH actors are null (initial load), not on background refetches
- `LoginScreen.tsx`: Update background image path from `/assets/uploads/images-3--1.jpeg` to `/assets/uploads/images-3-2-1.jpeg` (newly uploaded file)

### Remove
- Nothing removed

## Implementation Plan
1. Fix `FeedPage.tsx` — use `actor` presence check instead of `isFetching` for `actorLoading`
2. Fix `LoginScreen.tsx` — update background image path to match newly uploaded asset
