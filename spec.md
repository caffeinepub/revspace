# RevSpace

## Current State
RevSpace is a full-stack ICP car-enthusiast social platform with 25+ pages. The Motoko backend stores posts, profiles, cars, events, listings, clubs, notifications, and messages. The frontend uses React + TypeScript + Tailwind. Uploads are handled via `StorageClient.ts` (chunked PUT to the Caffeine storage gateway) and wired through `useUploadFile()` in `useQueries.ts`. The `CreatePostPage` captures a file, uploads it, then calls `createPost` with the returned URL. Several prior fixes addressed auth race conditions, MIME types, HEIC conversion, and retry logic.

## Requested Changes (Diff)

### Add
- **Server-side draft posts**: new `PostDraft` type + `saveDraft`, `getDraft`, `deleteDraft`, `publishDraft` endpoints in Motoko so captions, topic, and post type survive browser cache clears.
- **Upload state tracking**: `UploadState` type in backend (`pending | uploading | processing | complete | failed`) with `recordUploadStart`, `recordUploadComplete`, `recordUploadFailed`, `cleanupStaleDrafts` endpoints.
- **Abandoned upload cleanup**: `cleanupStaleDrafts` removes drafts older than 24 h that never reached `complete` state.
- **Pre-upload validation hook** (`useFileValidator`): validates file size (image ≤ 50 MB, video ≤ 500 MB), MIME type (rejects unsupported), aspect ratio for reels (warns if not 9:16), and video duration (warns if > 10 min) — all before any bytes are sent.
- **MIME-aware upload**: `useUploadFile` passes correct `Content-Type` header per file so CDN serves images/videos with the right type.
- **Draft autosave in CreatePostPage**: every time caption or topic changes, autosave debounces to backend via `saveDraft`. A "Draft saved" confirmation badge appears. On mount, restores the last draft if one exists.
- **Transactional post publish**: `publishDraft` in Motoko atomically moves a draft to a real post only if the mediaUrl is non-empty (i.e., upload succeeded). No partial posts.
- **Actionable error messages**: upload errors include a plain-English reason (size, format, auth, network) plus whether the draft was saved and what to do next.
- **Rate limiting by action**: `RateLimiter` module in Motoko tracks per-action counters (createPost, sendMessage) with separate windows, not a single per-user counter.
- **Upload health monitor component**: `UploadHealthBanner` shown in CreatePostPage and Settings that displays live upload failure count, last error, and a "clear" button — visible to users so they know the system state.

### Modify
- `useUploadFile`: add correct `Content-Type` (image/jpeg, video/mp4, etc.) based on file MIME type; integrate with draft autosave lifecycle (record start → record complete/failed).
- `CreatePostPage`: wire draft autosave, restore draft on mount, add validation step before upload begins, improve progress UI with stage labels (Validating → Uploading → Publishing).
- `StorageClient.putFile`: pass `Content-Type` in `fileHeaders` from the actual file type rather than hardcoded `application/octet-stream`.

### Remove
- Hardcoded `application/octet-stream` as the `Content-Type` in `StorageClient.putFile` — replace with file-derived MIME type.
- LocalStorage-only draft state — move to server-side drafts so clearing browser data doesn't lose work.

## Implementation Plan
1. Add `PostDraft`, `UploadRecord`, and `RateLimiter` types + state maps to `main.mo`.
2. Add `saveDraft`, `getDraft`, `deleteDraft`, `publishDraft`, `recordUploadStart`, `recordUploadComplete`, `recordUploadFailed`, `cleanupStaleDrafts`, `getUploadStats` endpoints.
3. Add per-action rate limiting to `createPost`, `createListing`, `sendMessage`.
4. Update `StorageClient.putFile` to accept and pass `contentType` so files are served with correct MIME.
5. Update `useUploadFile` to pass `contentType`, record upload start/complete/failed in the backend.
6. Add `useFileValidator` hook with size, MIME, duration, and aspect-ratio checks.
7. Add `useDraftPost` hook: debounced autosave to backend, restore on mount, clear on publish.
8. Revamp `CreatePostPage` with multi-stage progress (Validating → Uploading → Publishing), draft restore banner, and actionable errors per failure type.
9. Add `UploadHealthBanner` component showing live failure stats.
10. Run typecheck + build to verify zero errors.
