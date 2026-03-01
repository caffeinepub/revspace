# RevSpace

## Current State
Full-featured car enthusiast social platform on ICP. Backend has on-chain storage for posts, profiles, cars, events, listings, clubs, notifications, messages, and follows. RevBucks balance/transactions/gifts, Pro status, and Model account status are all stored only in localStorage — they vanish when a user clears browser data or updates the app. Model Reels and Model Gallery pages show all reels from any user (no model-account restriction on who can post there). The registered-users counter in the feed is a post-count workaround — it counts distinct authors rather than actual registered users.

## Requested Changes (Diff)

### Add
- Backend: `UserMeta` record per principal storing `revbucksBalance: Nat`, `isPro: Bool`, `isModel: Bool`, `modelSpecialty: Text`, `modelSocialHandle: Text`, `modelBookingContact: Text`, `modelYearsActive: Text`
- Backend: `revbucksTransactions` map (principal → list of transaction records: id, type, description, amount, timestamp)
- Backend: `receivedGifts` map (principal → list of gift records: id, giftId, giftName, giftEmoji, fromPrincipal, timestamp)
- Backend: `getMyUserMeta()` — returns the caller's UserMeta (or defaults)
- Backend: `getUserMeta(user: Principal)` — public read of any user's isPro/isModel (for display on profiles/posts)
- Backend: `saveUserMeta(isPro, isModel, modelSpecialty, modelSocialHandle, modelBookingContact, modelYearsActive)` — saves caller's meta
- Backend: `addRevBucks(amount: Nat)` — admin-only, credit RB to any principal
- Backend: `awardRevBucks(reason: Text)` — internal helper called by createPost, likePost, etc.
- Backend: `deductRevBucks(amount: Nat)` — deducts from caller balance, returns Bool success
- Backend: `recordRevBucksPurchase(amount: Nat, packName: Text)` — called on Stripe redirect
- Backend: `sendGift(recipientPrincipal: Principal, giftId: Text, giftName: Text, giftEmoji: Text, cost: Nat)` — deducts from caller, records gift for recipient
- Backend: `getMyRevBucksTransactions()` — returns caller's transaction history
- Backend: `getMyReceivedGifts()` — returns caller's received gifts
- Backend: `getTotalRegisteredUsers()` — returns count of all principals who have ever called saveCallerUserProfile or saveUserMeta (true headcount)
- Backend: Post type extended with `isModelPost: Bool` flag — set true when posting author has isModel=true at time of post
- Backend: `adminAwardRevBucks(user: Principal, amount: Nat)` — admin panel manual credit
- Backend: `adminGetUserMeta(user: Principal)` — admin read

### Modify
- Backend: `createPost` — awards +10 RB on-chain after successful post; sets `isModelPost` flag based on caller's current isModel status
- Backend: `likePost` — when a post reaches a multiple of 10 likes, awards +5 RB to post author on-chain
- Model Reels / Model Gallery pages — filter to only show posts where `isModelPost === true`
- Settings page — ModelAccountCard and ProCard save/load from backend via `saveUserMeta` / `getMyUserMeta` instead of localStorage
- RevBucks page — balance, transactions, gifts all loaded from backend; Stripe redirect calls `recordRevBucksPurchase` on-chain; gift sends call `sendGift` on-chain
- Pro page — Pro status loaded from backend `getMyUserMeta().isPro`; Stripe redirect calls `saveUserMeta` with `isPro=true`
- Feed page header — registered user count uses `getTotalRegisteredUsers()` instead of distinct post authors
- CreatePost page — remove `awardPostCreation` localStorage call (backend now handles it)

### Remove
- localStorage-only RevBucks balance/transactions/gifts logic as primary source (keep as display fallback during loading only)
- localStorage-only Pro status as primary source
- localStorage-only Model account status as primary source

## Implementation Plan
1. Add `UserMeta` type + `userMeta` map to backend Motoko
2. Add `revbucksTransactions` and `receivedGifts` maps with transaction/gift types
3. Add `registeredUsers` set to track true headcount
4. Implement all new query/update backend functions
5. Modify `createPost` to award RB on-chain and set `isModelPost`
6. Modify `likePost` to award RB on 10-like milestones
7. Extend `PostView` with `isModelPost: Bool`
8. Update `saveCallerUserProfile` and `saveUserMeta` to register into `registeredUsers` set
9. Frontend: update `useQueries` hooks with new backend calls
10. Frontend: RevBucks lib — wrap backend calls, keep localStorage as in-memory cache only
11. Frontend: Pro lib — read/write from backend
12. Frontend: Model account lib — read/write from backend
13. Frontend: ModelReelsPage — filter `p.isModelPost === true`
14. Frontend: ModelGalleryPage — filter `p.isModelPost === true`
15. Frontend: Feed registered user count — use `getTotalRegisteredUsers()`
16. Frontend: Settings ModelAccountCard — save/load via backend
17. Frontend: Settings ProCard — save/load via backend
18. Frontend: RevBucksPage — all balance/transaction/gift ops via backend
19. Frontend: ProPage — Pro status and Stripe credit via backend
20. Frontend: CreatePost — remove localStorage RB award call
