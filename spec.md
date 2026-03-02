# RevSpace

## Current State
- Model Reels and Model Gallery pages already filter display to model-account posts only
- CreatePostPage has no model-account gate — any user can currently post any type from that page
- Build Battle allows one user to fill out both Car A and Car B in a single modal, uploading both cars themselves

## Requested Changes (Diff)

### Add
- Model-only posting gate in CreatePostPage: if the URL query param `?section=model` is present (or postType is Reel/Video and user navigated from a model section), check `isModel` from `useUserMeta`. If not a model account, show an inline block with a prompt to go to Settings — disable the Publish button.
- Simpler approach: add a `?modelOnly=1` query param that CreatePostPage reads; if present and user is not a model, show a full-screen gate instead of the form.
- Build Battle "challenger" flow: when creating a battle, the creator fills out only Car A (their own car) and optionally sets a title. The battle starts in a `pending` state with Car B empty. A "Join Battle" button appears on the battle card — any other signed-in user can click it, fill out their Car B info + photo, and complete the battle. Once both cars are submitted the battle goes live for voting.

### Modify
- `BuildBattlePage` / `SubmitModal`: creator only submits Car A. Battle saved with `status: "open"` (waiting for challenger).
- `BattleCard`: show a "Join This Battle" button when `status === "open"` and the viewer is not the Car A owner. Clicking opens a `JoinBattleModal` where the challenger submits Car B.
- `buildBattle.ts`: add `status: "open" | "active" | "ended"` field to `Battle`. `createBattle` only takes `carA`, sets `carB` to null/placeholder. New `joinBattle(battleId, carB)` function sets Car B and changes status to `"active"`.
- `ModelReelsPage` and `ModelGalleryPage`: already gate display; optionally reinforce with a clearer "Post here" CTA that passes `?modelOnly=1` to the create page.
- `CreatePostPage`: read `?modelOnly=1` query param; if set and `isMyAccountModel === false`, render a gate UI (purple banner + Settings button) instead of the post form.

### Remove
- The dual-car form in `SubmitModal` (remove Car B section from the create flow — creator only fills Car A now)

## Implementation Plan
1. Update `buildBattle.ts`: add `status` field, update `createBattle` to accept only `carA` and set status `"open"`, add `joinBattle(battleId, carB)` function, update `getActiveBattles` to show both `"open"` and `"active"` battles.
2. Update `BuildBattlePage` / `SubmitModal`: remove Car B form, creator submits only their own car. 
3. Update `BattleCard`: show "Join This Battle" CTA when `status === "open"` and viewer is not carA owner. Add `JoinBattleModal` component for challenger to upload their Car B.
4. Update `CreatePostPage`: read `modelOnly` search param from router; if truthy and user is not a model account, show a purple gate UI instead of the post form with a link to Settings.
5. Update `ModelReelsPage` and `ModelGalleryPage` "Upload" CTAs to link with `?modelOnly=1`.
