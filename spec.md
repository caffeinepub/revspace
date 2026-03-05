# RevSpace

## Current State
The Feed page renders all posts at once in a vertical list using `PostCard` components. Videos use `autoPlay` with `preload="none"` but all cards mount simultaneously, causing browsers to compete for network resources. Broken media shows broken image icons. Posts are sorted newest-first but all load together. The `PostCard` component handles its own video playback with a ref.

## Requested Changes (Diff)

### Add
- Full-screen snap-scroll feed layout: one post fills the viewport at a time, users swipe/scroll to move between posts (CSS `scroll-snap` on a full-height container)
- IntersectionObserver on each post card so videos only play when the post is 80%+ visible in the viewport; video is paused and `src` cleared when off-screen to free memory
- Skeleton/placeholder shown while the visible post's media is loading
- Error fallback UI for broken images (placeholder car silhouette) and broken videos (error message with retry)

### Modify
- `FeedPage.tsx`: Replace the current `space-y-0.5` list with a full-viewport snap-scroll container. Each post takes `100dvh` (dynamic viewport height). Only render media for the currently visible post (virtualisation via IntersectionObserver).
- `PostCard.tsx`: Add IntersectionObserver hook — when the card exits the viewport, pause video and set `src=""` to release the network connection. When it enters, restore `src` and play. Add image/video error state with a styled fallback.
- Posts remain sorted newest-first (no change to sort logic).

### Remove
- `autoPlay` attribute on videos in the feed — replaced by IntersectionObserver-driven play/pause to prevent all videos autoplaying on mount.

## Implementation Plan
1. Update `PostCard.tsx`:
   - Accept an `isVisible` prop (boolean) from the parent feed
   - When `isVisible` becomes false: pause video, clear `src` to drop network connection
   - When `isVisible` becomes true: restore `src` from `post.mediaUrls[0]`, call `video.play()`
   - Add `onError` image fallback (styled dark card with car icon + "Media unavailable")
   - Add `onError` video fallback (same styled card + "Video unavailable" text)
   - Remove `autoPlay` from `<video>` — playback driven by visibility

2. Update `FeedPage.tsx`:
   - Wrap the feed in a `h-[100dvh] overflow-y-scroll snap-y snap-mandatory` container
   - Each post item: `h-[100dvh] snap-start snap-always flex flex-col`
   - Use `IntersectionObserver` (threshold 0.8) to track which post index is currently visible
   - Pass `isVisible={index === visibleIndex}` to each `PostCard`
   - Keep the header banner above the snap container (sticky/fixed or as first snap section)
   - Keep newest-first sort
