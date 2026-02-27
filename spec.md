# RevSpace

## Current State
- Reels are uploaded as video files via the blob-storage system (StorageClient).
- The ReelsPage renders videos using an HTML `<video>` element with `autoPlay`, `muted`, and `loop` -- sound is permanently muted with no toggle.
- The CreatePostPage has no file size or duration limits enforced in the UI; it accepts any `video/*` file.
- Videos display full-screen in a snap-scroll layout.
- The backend stores post data (mediaUrls as strings) -- no duration metadata is persisted, only URLs.
- Scalability is handled by the ICP platform and Caffeine blob-storage infrastructure natively.

## Requested Changes (Diff)

### Add
- Sound toggle button on each reel (mute/unmute, defaulting to muted on first view).
- Video progress bar at the bottom of each reel showing playback position.
- File size guidance in CreatePostPage for Reel type (e.g., "Up to ~500MB recommended for 10-minute videos").
- A "10 min max" label in the Reel upload UI.
- Duration validation warning in CreatePostPage: if the selected video's duration exceeds 600 seconds (10 min), show a warning toast but still allow upload (server handles limits).

### Modify
- ReelsPage: Remove `muted` attribute from the video element; replace with a controlled `muted` state toggled by a new sound button.
- ReelsPage: Add a sound icon button (Volume2 / VolumeX) to the right-side action panel.
- ReelsPage: Add a thin progress bar at the very bottom of each reel card that updates as the video plays.
- CreatePostPage: Add duration check after file selection for Reel post type.

### Remove
- Nothing removed.

## Implementation Plan
1. Update `ReelsPage.tsx`:
   - Add `videoRef` per reel (use a Map or individual refs with a key-based approach).
   - Use a single global `isMuted` state (all reels start muted, user toggles globally, consistent with TikTok/Instagram UX).
   - Replace hardcoded `muted` prop with the `isMuted` state.
   - Add Volume2/VolumeX icon button to each reel's action panel.
   - Add an `<input type="range">` or a div-based progress bar synced to `timeupdate` events using `onTimeUpdate` handler.
2. Update `CreatePostPage.tsx`:
   - After file selection, if postType === "Reel", read `videoElement.duration` and warn if > 600s.
   - Update the helper text to mention "Up to 10 minutes".
