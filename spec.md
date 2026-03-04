# RevSpace

## Current State
- RevBucks shop has 17 gift items, model exclusives, "Send to a Model" items — all use basic send modal
- Posts support a single image/video via `mediaUrls[0]`
- Garage cars support a single image via `imageUrls[0]`
- FeaturedCar form supports a single image upload
- ClubsPage has join/leave functionality but joining a club does NOT update the user's profile
- ProfilePage shows display name, bio, location, posts, garage, gifts, and about tab — no club membership or flair displayed
- No reaction packs or custom emoji reactions exist
- No title/flair system exists

## Requested Changes (Diff)

### Add
- **Reaction Pack** — A purchasable item in the RevBucks shop (under a new "Customize" category) that unlocks a set of 5 custom emoji reactions (🔥🏎️⚡🤙💨) in addition to the default heart. PostCard reaction button shows a picker when tapped if user owns the pack. Stored in localStorage.
- **Title/Flair** — A purchasable item in the RevBucks shop (under "Customize" category). After purchasing, user can pick from a list of preset flair texts (e.g. "Track Day King", "Boost Addict", "JDM Loyalist", "Stance God", "Sleeper Build", "Boost Junkie", "Weekend Warrior"). Flair text displays under the username on ProfilePage and UserProfilePage as a small colored badge. Stored in localStorage per principal.
- **Club name on profile** — When a user joins a club, the club's name is saved to localStorage. ProfilePage "About" tab shows "Club: [ClubName]" if the user has joined a club. UserProfilePage also shows it under the user's name.

### Modify
- **GaragePage AddCarModal** — Expand from 1 image to up to 5 images. Show image thumbnails in a horizontal scroll row. Upload each sequentially. All uploaded URLs stored in `imageUrls[]`.
- **GaragePage CarDetailModal** — Show an image carousel/slideshow when there are multiple images.
- **FeaturedCarPage SubmitModal** — Expand from 1 image to up to 5 images. Show image thumbnails row. Upload each sequentially. All URLs stored in the FeaturedCar object.
- **FeaturedCarCard** — Show image carousel (dots navigation) when car has multiple images.
- **RevBucksPage ShopTab** — Add a "Customize" category section with Reaction Pack and Title/Flair items. These use a special purchase flow (deduct RB + save to localStorage) instead of the send-gift flow.
- **PostCard** — Reaction button (like button area) opens an emoji picker if user owns the Reaction Pack. Otherwise behaves as normal heart like.
- **ProfilePage About tab** — Show club membership if user has joined a club.
- **ClubsPage ClubDetailModal** — On successful join, save club name to localStorage key `revspace_club_${principalId}`.

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/frontend/src/lib/customizations.ts` — localStorage helpers for reaction pack ownership, flair selection, club membership storage, and title/flair options list.
2. Update `RevBucksPage.tsx` — Add "Customize" category with Reaction Pack (150 RB) and Title/Flair (100 RB) items. These use a new `BuyCustomizationModal` that deducts RB and saves to localStorage.
3. Update `PostCard.tsx` — If user owns reaction pack, tapping the like button shows a small emoji picker (🔥🏎️⚡🤙💨 + ❤️). Selected emoji is shown next to the count. If no pack, heart like works as before.
4. Update `ProfilePage.tsx` — Show flair badge under username (from localStorage). Show club name in About tab.
5. Update `UserProfilePage.tsx` — Show flair badge under username.
6. Update `ClubsPage.tsx` — On successful join, save club name to localStorage.
7. Update `GaragePage.tsx` — AddCarModal supports up to 5 images. CarDetailModal shows image carousel.
8. Update `FeaturedCarPage.tsx` — SubmitModal supports up to 5 images. FeaturedCarCard shows image carousel with dot indicators.
