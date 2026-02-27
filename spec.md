# RevSpace

## Current State
- Reels page shows all posts with video/image media; no delete functionality exists for posts
- Marketplace page has a delete button in the listing detail modal, but it does not work reliably (backend `deleteListing` exists and is wired, but error handling/state management may silently fail)
- Backend has `deleteListing` but no `deletePost` function

## Requested Changes (Diff)

### Add
- `deletePost` function in Motoko backend (only the post author can delete their own post)
- `useDeletePost` hook in `useQueries.ts`
- Delete button in ReelsPage for the signed-in user's own reels (shown as a trash icon in the action buttons column)

### Modify
- Marketplace `ListingDetailModal`: improve the delete flow with better error messaging, ensure the delete button is only shown when the user is the listing owner, and the mutation errors are surfaced correctly

### Remove
- Nothing removed

## Implementation Plan
1. Add `deletePost` to `main.mo` — checks caller is post author, removes from `posts` map
2. Regenerate `backend.d.ts` to include `deletePost(postId: string): Promise<void>`
3. Add `useDeletePost` mutation hook to `useQueries.ts`
4. In `ReelsPage.tsx`, add a trash icon button in the right-action column, visible only when `post.author.toString() === myPrincipal`; on click, confirm and call `deletePost`, then invalidate posts query
5. In `MarketplacePage.tsx`, add `onError` toast for delete mutation so failures are visible to the user

## UX Notes
- Delete on reels: show a small trash icon button in the right action stack; confirm with a simple inline state (no modal needed, just a tap-to-confirm approach)
- Marketplace: the delete already works in code, so the fix is ensuring error states are surfaced and the modal closes correctly on success
