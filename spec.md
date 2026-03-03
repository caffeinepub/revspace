# RevSpace — DynoOS Page

## Current State
RevSpace is a full-featured car enthusiast social platform. It has numerous pages including Feed, Garage, TrackReady, GamePage, etc. Navigation is grouped in sections (Discover, Models, Community, Marketplace, Pro Perks, Account, Info). There is currently no DynoOS page.

## Requested Changes (Diff)

### Add
- New page at `/dyno-os` — DynoOS marketing/feature overview page
- Route registered in App.tsx
- Nav entry added under "Pro Perks" section in Layout.tsx

### Modify
- `Layout.tsx`: Add DynoOS link to "Pro Perks" nav group (or new "Tools" group)
- `App.tsx`: Import and register the new route

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/frontend/src/pages/DynoOSPage.tsx` — a rich, dark landing-page-style feature overview with:
   - Hero section: "DynoOS — The Operating System for Dyno Tuners" with tagline
   - "What It Solves" problem framing section
   - 5 feature cards (Dyno Session Manager, Run Comparison Engine, Tune Version Control, Customer Power Report Generator, Safety & Anomaly Detection) with icons, descriptions, and bullet points
   - CTA section at bottom
2. Add route `/dyno-os` in `App.tsx`
3. Add nav item to Layout.tsx under "Pro Perks" or a new "Tools" section
