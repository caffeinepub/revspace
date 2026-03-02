# RevSpace

## Current State
Full-featured car enthusiast social platform. v110 is live. Three bugs reported post-v110 deploy:
1. Reels page — image posts (postType "Photo") posted to reels don't display correctly because `<img>` lacks `absolute inset-0` positioning inside the full-height reel card container.
2. Feed member count — only shows when `memberCount > 0`, so if posts load as empty array (cold-start) or there are genuinely 0 posts, count never shows. Also no loading state shown while posts are fetching.
3. General: Both `ReelsPage` and `ModelReelsPage` filter for `Reel`/`Video` post types only, which is correct — but the images in `ExplorePage` trending grid fall back to `picsum.photos` placeholder URLs when `mediaUrls[0]` is undefined/empty, which causes broken image appearance.

## Requested Changes (Diff)

### Add
- Loading skeleton for member count in FeedPage while `isLoading` is true
- `absolute inset-0` class to the image element inside `ReelMedia` in `ReelsPage` so photo posts fill the full viewport like videos do

### Modify
- `ReelMedia` image: add `absolute inset-0` and correct `object-cover` positioning classes to match the video element layout
- `FeedPage` member count: show a loading pill when `isLoading` is true; show the count when data is ready and posts exist; show "0 members" only if explicitly 0 (not hidden)
- `ExplorePage` trending grid: add `onError` fallback on `<img>` to hide broken images gracefully instead of showing a broken icon
- Member count logic: use `?? 0` pattern so it shows "0 members" during cold-start recovery rather than disappearing entirely

### Remove
- The `memberCount > 0` gate — replace with `memberCount !== null` so it shows even when count is 0

## Implementation Plan
1. Fix `ReelMedia` component: add `absolute inset-0` to the `<img>` element so photo posts fill the viewport in the full-screen reel view
2. Fix `FeedPage` member count: show loading skeleton pill while `isLoading`; show count when `memberCount !== null` (including 0)
3. Fix `ExplorePage` trending image grid: add `onError` handler to hide broken images gracefully
4. Audit any other places where `mediaUrls[0]` is used without null guard and fix accordingly
