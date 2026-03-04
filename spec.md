# RevSpace

## Current State
The app has two ad banners: a BullBoost Performance fixed bottom banner and an eBay parts sidebar/mobile strip banner. Both reference image files in `/assets/uploads/` that were reported as broken/not displaying. The BullBoost banner showed a broken image placeholder, and the eBay banner also showed broken.

## Requested Changes (Diff)

### Add
- New generated image for Bull Boost Performance banner: `/assets/generated/bull-boost-banner.dim_600x80.png`
- New generated image for eBay parts banner: `/assets/generated/ebay-parts-banner.dim_400x90.png`

### Modify
- `BullBoostBanner` component: switch src from `/assets/uploads/z86GgQCwZ7Hm4-1.png` to new generated image; add `onError` handler to hide broken img; make text label always visible (removed `hidden sm:inline` so it shows on mobile too)
- Mobile eBay ad strip: switch src to new generated image; add `onError` handler
- Desktop sidebar eBay ad: switch src to new generated image; add `onError` handler with text fallback

### Remove
- Nothing removed

## Implementation Plan
1. Generate Bull Boost Performance banner image (done)
2. Generate eBay parts banner image (done)
3. Update Layout.tsx BullBoostBanner to use new image with onError fallback
4. Update mobile eBay strip to use new image with onError fallback
5. Update desktop sidebar eBay banner to use new image with onError fallback
6. Deploy
