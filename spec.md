# RevSpace

## Current State
- Feed renders all posts as snap targets but uses IntersectionObserver + `isNearVisible` to only render the actual PostCard for the visible post (others are blank spacers). The `isNearVisible` check is `index === visibleIndex` — single post only.
- Admin page calls `adminGetAllProfilesPublic("Meonly123$")` which may not exist in current backend, causing silent fall-through to `getAllPosts()` which also fails → "can't load" error.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- **FeedPage**: Fix the feed so it truly shows only the newest (first) post on load. The root issue: `visibleIndex` starts at 0 (correct, newest first) but if the IntersectionObserver fires for a wrong index due to layout, multiple PostCards render. Simplify: remove virtual windowing complexity entirely — just show posts one at a time using a simple index pointer, no IntersectionObserver needed. Show post at `currentIndex`, provide next/swipe-down and back navigation, or keep snap scroll but ensure only one item is ever rendered as a real card (not just the "visible" one).
- **AdminPage / UsersTab**: Fix "can't load" — the `adminGetAllProfilesPublic` backend call fails silently, then `getAllPosts` also fails. Add a proper catch that shows the error state. Also ensure that when `actor` is `null` (public actor not yet ready), `loadUsers` waits for it properly instead of returning early with an error.

### Remove
- Remove the complex IntersectionObserver virtual windowing from FeedPage — replace with a simpler approach: render ONE post at a time (the newest by default), with the snap scroll container just having that one post visible. Use a simple sorted array and show `displayPosts[0]` (newest) as the only rendered post, with paging via scroll that renders adjacent posts lazily.

## Implementation Plan
1. **FeedPage**: Change to show only the single newest post initially. Keep snap scroll but simplify: always render only 3 posts in DOM (previous, current, next) using a simple `currentIndex` state. Remove IntersectionObserver in favor of `onScroll` detection, or simply render just the top 1 post with a "load more" scroll. The cleanest solution: only render `displayPosts[0]` (the newest post), and add an "older posts" section that lazy-loads one-by-one as user scrolls. This guarantees only 1 post shows at a time.
2. **AdminPage**: Fix the users loading — add explicit error logging, ensure the `loadError` state is set correctly when both strategies fail, and show a more helpful error message. Also ensure `actor` is awaited properly before calling `adminGetAllProfilesPublic`.
