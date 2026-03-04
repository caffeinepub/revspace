# RevSpace

## Current State
Full-featured car-enthusiast social platform on ICP. The app has been suffering a recurring bug where **everything throws error messages** after deploys — feed not loading, profile not showing, reels not loading.

**Root cause identified:** The Motoko backend requires `hasPermission(caller, #user)` on ALL endpoints — including public read-only queries like `getAllPosts`, `getProfile`, `getCommentsForPost`, `getFollowers`, etc. On a canister cold-start, callers are not yet registered in the `userRoles` map. This means every query returns "Unauthorized" until `_initializeAccessControlWithSecret` is called. The frontend has layered retry/registration logic on top of this, but it's fundamentally the wrong approach — the backend itself is too restrictive.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- **Backend:** Relax permission check on all public read-only query endpoints to allow `#guest` callers (i.e., `hasPermission(caller, #guest)` or no-auth check). This includes: `getAllPosts`, `getPostsByUser`, `getCommentsForPost`, `getRepliesToComment`, `getProfile`, `getMyProfile`, `getCallerUserProfile`, `getUserProfile`, `getFollowers`, `getFollowing`, `isFollowing`, `listAllEvents`, `getEventAttendees`, `getEventPhotos`, `listAllListings`, `listAllClubs`, `getClubMembers`, `getMyGarage`, `getGarageByUser`, `listMyNotifications`, `getConversations`, `getMessagesWithUser`.
- **Backend:** Write mutations (createPost, likePost, sendMessage, etc.) stay gated at `#user` — no change.
- **Frontend useQueries.ts:** `useGetAllPosts`, `useGetPostsByUser`, `useGetComments`, `useGetCommentReplies`, `useGetProfile`, `useGetFollowers`, `useGetFollowing`, `useIsFollowing` — switch all of these from waiting for actor to using `useActor` directly (most already do), ensure `enabled` does NOT wait for registration state.
- **Frontend useRegisteredActor.ts:** Reduce registration delay from 500ms to 100ms since it's no longer a blocker for reads.
- **Frontend useDeployGuard.ts:** Keep as-is (correct behavior).

### Remove
- Nothing removed

## Implementation Plan
1. Edit `main.mo`: change all public-read query functions to use `hasPermission(caller, #guest)` instead of `#user`, so anonymous and cold-start callers can read data immediately.
2. Edit `useQueries.ts`: confirm all read hooks use `useActor` (not `useRegisteredActor`) — already mostly correct; verify `useMyProfile` which currently uses `useRegisteredActor`.
3. Edit `useRegisteredActor.ts`: reduce the 500ms delay to 100ms.
4. Build and deploy.
