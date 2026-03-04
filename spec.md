# RevSpace

## Current State
Full-featured car enthusiast social platform on ICP. Three bugs reported by user: (1) game page hero image broken, (2) RevBucks balance not updating after purchase / store items can't be bought, (3) Pro crown badge not appearing after upgrade.

## Requested Changes (Diff)

### Add
- Generated fallback hero image for Street Legends game page (`/assets/generated/street-legends-hero.dim_800x400.jpg`) — always present in build output regardless of upload path changes.

### Modify
- **GamePage.tsx**: Switched primary `GAME_SCREENSHOT` to the generated image; added `GAME_SCREENSHOT_FALLBACK` pointing to the uploaded PNG; all three `<img>` tags now have `onError` handlers that swap to the fallback if the primary fails.
- **RevBucksPage.tsx**: Replaced `balance = profileLoaded ? onChainBalance : localBalance` logic (which caused balance to show as 0 when on-chain was stale) with a local React state initialized from localStorage. On-chain value is merged in using `Math.max()` once profile loads. `refreshBalance()` now actually calls `setBalance(getBalance(...))`. `handleDeductBalance` updates local state immediately after a gift purchase.
- **ProBadge.tsx**: Now imports and calls `useUserMeta()` to check `meta.isPro` alongside the existing `isUserPro()` localStorage check — crown shows if either source says Pro (reactive, not just a static read).
- **ProPage.tsx**: Pro activation on Stripe redirect now always calls `setUserPro()` (localStorage) unconditionally and shows success toast immediately; on-chain sync runs as a background retry without blocking the toast.

### Remove
- Nothing removed.

## Implementation Plan
1. Generate Street Legends hero image as static asset. ✅
2. Update GamePage image references with fallback handlers. ✅
3. Fix RevBucksPage balance state to use local React state with immediate updates. ✅
4. Fix ProBadge to reactively read on-chain Pro status. ✅
5. Fix ProPage activation flow to show crown immediately on Stripe redirect. ✅
6. Build and deploy. ✅
