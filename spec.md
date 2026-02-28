# RevSpace

## Current State
- Build Battle duration is hardcoded to 7 days (`SEVEN_DAYS_MS`) in `buildBattle.ts` and the UI text throughout `BuildBattlePage.tsx` references "7 days"
- Profile data is saved to localStorage cache and backend, but the cache fallback only restores `displayName`, `bio`, `location` -- it does not restore `avatarUrl` and `bannerUrl` reliably across sessions
- The `useMyProfile` query only caches/restores data when backend returns nothing, but if profile exists on backend with empty avatar it doesn't restore from cache
- Vite config has no explicit browser targets (`build.target`) which defaults to modern-only ES modules -- Safari 14 and older Chromium versions may fail on optional chaining, `??=`, `at()`, etc.
- No `@vitejs/plugin-legacy` or explicit polyfills for older browsers
- The `index.html` missing explicit `<meta name="viewport">` restrictions that prevent zoom issues on iOS Safari
- `dvh` units (`min-h-screen` with `dvh`) not supported in older Safari/Firefox versions

## Requested Changes (Diff)

### Add
- `@vitejs/plugin-legacy` configured to target last 2 versions of major browsers including Safari 12+, Chrome 80+, Firefox 80+, Edge 80+ for broad compatibility
- Explicit `build.target: ['es2020', 'chrome80', 'firefox78', 'safari13.1', 'edge80']` in vite config
- Polyfill for `globalThis` in entry point
- Profile cache now stores and restores ALL fields including `avatarUrl` and `bannerUrl`
- Profile restore logic: even when backend returns a profile, if avatarUrl is empty but cache has one, merge cache data in
- `useMyProfile` and `useUpdateProfile` robustly write all fields (including avatar/banner URLs) to both backend and cache every time

### Modify
- `buildBattle.ts`: Change `SEVEN_DAYS_MS` constant to `FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000`
- `BuildBattlePage.tsx`: Update all UI text "7 days" → "5 days"
- `vite.config.js`: Add `build.target` for cross-browser support; add `@vitejs/plugin-legacy` if available
- `useMyProfile`: Merge backend profile with local cache, always returning most complete data (prefer non-empty avatar from cache if backend has empty)
- `useUpdateProfile`: On success, immediately update the React Query cache in addition to invalidating, for instant UI response

### Remove
- Nothing removed

## Implementation Plan
1. Update `buildBattle.ts`: rename `SEVEN_DAYS_MS` → `FIVE_DAYS_MS`, change value to 5 days
2. Update `BuildBattlePage.tsx`: replace all "7 days" text references with "5 days"
3. Update `vite.config.js`: add `build.target` for broad browser support; configure esbuild/rollup targets
4. Update `useQueries.ts` (`useMyProfile`): merge backend + cache data, ensure avatar/banner survive backend resets; always cache on profile load
5. Update `useQueries.ts` (`useUpdateProfile`): optimistically update query cache on success so UI doesn't flash empty data
6. Update `profileCache.ts`: add `mergeProfile` helper that prefers non-empty fields from either source
7. Build and validate
