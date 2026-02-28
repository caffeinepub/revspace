# RevSpace

## Current State
- Reels page: videos autoplay but start **muted** (`isMuted` defaults to `true`). A sound toggle button exists on each reel.
- Profile page: posts grid and garage grid render thumbnails but are **not clickable** to open/view the full content.

## Requested Changes (Diff)

### Add
- Lightbox/fullscreen viewer for profile post thumbnails -- clicking a post thumbnail opens the full image or video in an overlay with close button.
- Lightbox/fullscreen viewer for garage car images -- clicking a car image opens it fullscreen.

### Modify
- Reels: change `isMuted` default from `true` to `false` so reels auto-play **with sound** on page load.
- Reels: update the `ReelMedia` video element to remove the hardcoded `muted` attribute and the imperative `el.muted = true` on mount, so sound plays immediately.
- Profile posts grid: wrap each post thumbnail in a clickable element that opens the fullscreen viewer.
- Profile garage grid: wrap each car image in a clickable element that opens the fullscreen viewer.

### Remove
- Imperative `el.muted = true` initialization in the `ReelMedia` videoRef callback (was forcing mute on every mount).

## Implementation Plan
1. In `ReelsPage.tsx`:
   - Change `useState(true)` for `isMuted` to `useState(false)`.
   - In `ReelMedia`, remove `el.muted = true` from the ref callback.
   - Remove the `muted` prop from the `<video>` element (or leave it absent) so video starts with sound.
2. In `ProfilePage.tsx`:
   - Add a `selectedMedia` state: `{ url: string; type: "image" | "video" } | null`.
   - Add a fullscreen overlay component/section that renders when `selectedMedia` is set -- shows image or video centered, dark backdrop, X close button.
   - Make each post thumbnail `div` in the posts grid call `setSelectedMedia` on click.
   - Make each car image in the garage grid call `setSelectedMedia` on click.
