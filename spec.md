# RevSpace

## Current State
The Notifications page displays messages exactly as stored in the backend. The backend generates generic messages like:
- "Someone liked your post" (like, relatedId = postId)
- "Someone commented on your post" (comment, relatedId = postId)
- "Someone started following you" (follow, relatedId = follower's principal string)
- "You have a new message" OR "[senderName] sent you a message" (message, relatedId = messageId)

The backend cannot be modified (read-only). The `follow` relatedId contains the follower's principal. For `like`/`comment`, the relatedId is the postId, and the post's `likes` array / comments list contains the actors' principals.

The `message` type already works correctly when sent from MessagesPage (uses `sendNotificationToUser` with `${senderName} sent you a message`).

Available backend APIs:
- `getProfile(user: Principal): Promise<Profile | null>` — fetches any user's profile (displayName, avatarUrl, etc.)
- `getAllPosts(): Promise<Array<PostView>>` — PostView includes `id`, `author`, `likes: Principal[]`, `comments: string[]`
- `getCommentsForPost(postId: string): Promise<Array<Comment>>` — Comment has `author: Principal`, `content: string`, `postId`, `timestamp`
- `adminGetAllProfiles(): Promise<Array<ProfileWithPrincipal>>` — admin only

Existing hooks in `useQueries.ts`:
- `useGetProfile(user: Principal | undefined)` — fetches a single profile, cached
- `useAllPosts()` — fetches all posts, cached with staleTime 10s

## Requested Changes (Diff)

### Add
- In `NotificationsPage.tsx`: for each notification, resolve the actor's username and display it instead of "Someone":
  - **follow**: `relatedId` is the follower's principal string → fetch their profile → show `"[displayName] started following you"`
  - **like**: `relatedId` is postId → from allPosts cache, find the post → identify the most recent liker. Since the backend just stores principal arrays without timestamps, use the last item in the `likes` array as the most recent. Show `"[displayName] liked your post"`
  - **comment**: `relatedId` is postId → fetch comments for that post → find the most recent comment not by the current user → show `"[displayName] commented on your post"` and optionally show a short preview of the comment text below the message
  - **message**: already shows sender name from MessagesPage — but old notifications from the backend that say "You have a new message" should keep that text since we can't resolve the sender (the relatedId is the message ID, not the sender's principal)
- Username resolution should be async/lazy — show "Someone" as fallback while loading, then swap in the username once resolved
- Keep all existing click navigation behavior intact

### Modify
- `NotificationsPage.tsx` — add username resolution logic per notification type using React hooks + lazy profile fetching

### Remove
- Nothing removed

## Implementation Plan
1. In `NotificationsPage.tsx`, create a helper hook `useNotifActorName(notif)` or inline resolution:
   - For `follow` type: parse `relatedId` as Principal and call `useGetProfile()` 
   - For `like` type: get allPosts from cache (`useAllPosts`), find post by relatedId, get the last principal in `post.likes`, then fetch their profile
   - For `comment` type: use `useGetComments(postId)` for the relatedId, find the most recent comment (sort by timestamp), fetch its author's profile; also extract the comment text for a preview sub-line
   - For `message` type: if message starts with "Someone" or "You have", keep as-is (old backend notification). If it already includes a name, keep it
2. Replace the `{notif.message}` display with the enriched message (actor username substituted in)
3. For comments, add a second sub-line showing a truncated preview of the comment content (max 60 chars)
4. Show "@username" style formatting in the notification message so it's clear it's a username
5. Validate with typecheck and build
