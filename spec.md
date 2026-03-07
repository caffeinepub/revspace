# RevSpace — Video & Reels Performance Optimization

## Current State
RevSpace has a working reels/feed system with:
- IntersectionObserver-based lazy loading (basic)
- Virtual windowing keeping 5 posts in DOM (±2 around visible)
- Public actor singleton for fast initialization
- localStorage cache fallback for posts
- Snap-scroll single-post feed layout
- Service worker for PWA notifications (no media caching)
- Videos load with `preload="metadata"` or `preload="none"` depending on visibility
- No client-side video compression or thumbnail generation
- No chunked video upload — files sent as single blobs
- No video-specific service worker caching strategy
- ReelsPage has basic IntersectionObserver but no windowing or memory unloading

## Requested Changes (Diff)

### Add
- **Client-side video thumbnail generation** — canvas-extracted frame at upload time; thumbnail URL stored alongside video URL in post metadata
- **Thumbnail-first loading** — feed and reels show generated poster/thumbnail image until user taps or video scrolls into view
- **Client-side video compression utility** — before upload, use MediaRecorder + canvas or browser-native APIs to downscale videos >720p and warn user; fall back gracefully if browser doesn't support it
- **Chunked upload lib** — `lib/videoChunker.ts` — splits video blob into 1–2MB segments, uploads each chunk, returns final assembled URL; used by CreatePostPage for video/reel uploads
- **Strict virtual windowing for ReelsPage** — only 2–3 `<video>` elements in DOM at any time; elements further away get `src=""` cleared to free memory
- **Next-reel preloading** — when reel N is playing, silently load `<link rel="preload">` or set `preload="metadata"` on reel N+1
- **Video-aware service worker caching** — update `sw.js` with a stale-while-revalidate cache for video requests and a network-first strategy for API calls; cache thumbnails with long TTL
- **Progressive shimmer placeholder** — while video/image loads, show a branded shimmer skeleton instead of empty black
- **Unload off-screen video elements** — clear `src` and call `load()` on video elements that exit the viewport by >2 positions to release memory

### Modify
- **CreatePostPage** — add `compressVideoIfNeeded()` call before upload; generate thumbnail frame from video before submitting; show compression progress indicator
- **ReelsPage** — replace current implementation with strict 3-video window, IntersectionObserver-driven play/pause/unload, next-reel preload, poster/thumbnail display before interaction
- **PostCard** — show thumbnail as poster on video posts; only set `src` when post is within visibility window; auto-pause when leaving view
- **FeedPage** — show thumbnail poster images on video feed cards; do not autoload video src until post is visible
- **sw.js** — add video/image cache strategy (Cache API with 50MB budget); serve cached media instantly on replay
- **index.html** — add `<link rel="preconnect" href="https://icp0.io">` for ICP edge gateway

### Remove
- Any `preload="auto"` on off-screen video elements
- Loading all video sources upfront in ReelsPage

## Implementation Plan

1. **`lib/videoProcessor.ts`** — new file:
   - `generateVideoThumbnail(file: File): Promise<string>` — draws first frame to canvas, returns base64 JPEG dataURL
   - `compressVideoIfNeeded(file: File, maxHeightPx?: number): Promise<File>` — if video height >720px or size >100MB, use canvas+MediaRecorder to transcode; returns original file if browser doesn't support it or video is already small enough
   - `splitVideoIntoChunks(file: File, chunkSizeMB?: number): Blob[]` — splits ArrayBuffer into 1–2MB blobs; returns array

2. **`lib/videoChunker.ts`** — new file:
   - `uploadVideoInChunks(file: File, uploadFn, onProgress): Promise<string>` — splits file, uploads each chunk sequentially with progress callbacks, returns final URL

3. **CreatePostPage** — before submitting video/reel post:
   - Call `generateVideoThumbnail` → store thumbnail dataURL in state
   - Show thumbnail preview in the upload UI
   - Call `compressVideoIfNeeded` with progress toast
   - Upload thumbnail image first via `uploadFile`
   - Attach thumbnail URL to post metadata (use `mediaUrls[1]` slot or a `thumbnailUrl` field passed in `content` as JSON metadata prefix)

4. **ReelsPage** — full rewrite of the reel player logic:
   - Only render 3 `<video>` elements total (prev, current, next) using index math
   - All other reel slots render as `<div>` placeholders with poster `<img>` showing the thumbnail
   - When scroll position changes, reassign which 3 slots hold real `<video>` elements
   - Auto-play current reel when it becomes ≥60% visible, pause when it leaves
   - Preload next reel `<video>` with `preload="metadata"` and `poster` set
   - Use `data-ocid` markers on all interactive controls

5. **PostCard** — video handling:
   - Extract thumbnail from `post.mediaUrls` (check for thumbnailUrl in post content prefix)
   - Set `poster` attribute on `<video>` elements to show thumbnail
   - Only set `src` when `isVisible` prop is true
   - When `isVisible` becomes false, clear `src` and call `.load()` after delay

6. **FeedPage** — no autoplay videos in feed; show static poster thumbnail; only set video `src` when post is the current snap-scroll item

7. **sw.js** — add:
   - Cache-first strategy for `/assets/` image files with 7-day max-age
   - Stale-while-revalidate for video blob URLs
   - Limit cache to 50MB using eviction logic

8. **index.html** — add preconnect to `https://icp0.io` and `https://raw.icp0.io`
