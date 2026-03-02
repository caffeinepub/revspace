# RevSpace

## Current State
Full-featured social media platform for car enthusiasts. React + TypeScript + Tailwind frontend on ICP. 28 pages, all imported eagerly in App.tsx. Vite build has `minify: false`. Google Fonts loaded synchronously via CSS `@import`. Videos autoplay in feed. All pages load regardless of whether the user visits them. staleTime on some queries is very short (e.g. 10s for posts).

## Requested Changes (Diff)

### Add
- Route-based code splitting (lazy load all 28 page components via `React.lazy` + `Suspense`)
- Vite build minification enabled (`minify: "esbuild"`)
- `font-display: swap` for Google Fonts to prevent render blocking
- Image lazy loading on all non-critical images (already on PostCard images; extend to Explore, Events, Clubs, Marketplace, etc.)
- `will-change: transform` on animated/transitioning elements to promote GPU layers
- Increase `staleTime` on stable queries (clubs, events, leaderboard, garage) to reduce redundant backend roundtrips
- `preload="none"` on videos that autoplay off-screen (PostCard feed videos)

### Modify
- App.tsx: Replace all static page imports with `React.lazy()` imports; wrap route components in `Suspense` with a lightweight `PageLoader` fallback
- vite.config.js: Set `minify: "esbuild"` and add `rollupOptions.output.manualChunks` to split vendor/ICP SDK into separate chunks
- index.css: Add `font-display: swap` to the Google Fonts import URL via `&display=swap` (already present — verify it's applied correctly) and add `content-visibility: auto` on heavy sections
- PostCard.tsx: Change video `preload` from `"metadata"` to `"none"` for off-screen autoplay videos to reduce bandwidth
- useQueries.ts: Increase `staleTime` on `useAllClubs`, `useAllEvents`, `useAllListings`, `useGarageByUser` from default/0 to 60_000ms

### Remove
- Nothing removed

## Implementation Plan
1. Update `vite.config.js` — enable `minify: "esbuild"`, add manual chunk splitting for `@dfinity`, `@icp-sdk`, `react`, `react-dom`, `@tanstack`
2. Update `App.tsx` — convert all 28 page imports to `React.lazy()`, add `PageLoader` Suspense fallback
3. Update `useQueries.ts` — raise `staleTime` on stable data queries
4. Update `PostCard.tsx` — change video `preload="metadata"` to `preload="none"`
5. Add CSS micro-optimizations: `content-visibility: auto` on feed items, smooth transitions
