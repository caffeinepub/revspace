# RevSpace — TunerOS / DynoOS Pro-Gated Functional Page

## Current State
- `/dyno-os` exists as a static marketing/landing page (DynoOSPage.tsx, 434 lines)
- It displays 5 feature cards, a hero image, a problem section, and a "Coming Soon" CTA
- It is NOT gated (anyone can view it)
- It has no interactive functionality — all features are described but not built
- Pro gating pattern established in GamePage.tsx: checks `isUserPro() || meta?.isPro`, shows lock screen with upgrade CTA for non-Pro, shows full content for Pro

## Requested Changes (Diff)

### Add
- Pro gate: non-Pro users see a locked promotional page with upgrade CTA (mirror GamePage pattern); Pro users see the full functional TunerOS platform
- **Tab 1 — Dyno Sessions**: Form to create a new dyno session (vehicle VIN, make/model/year, mods list, fuel type, boost level, weather temp/humidity); session list with status cards; per-session run log with run number, peak HP/TQ, notes, timestamp
- **Tab 2 — Run Comparison**: Side-by-side or overlay table comparing two runs from any session; auto-calculated HP/TQ delta and % change per run; visual diff highlight (gains green, losses red)
- **Tab 3 — TuneVault**: File version history list (filename, version number, date, change notes, who saved); "Add version" form (filename, change notes); ability to mark active version; access control toggle (active/revoked) per version entry
- **Tab 4 — Power Report**: Form to fill in customer name, shop name/logo text, before/after run selector, disclaimers; generated report preview card showing vehicle summary, mod list, power results, before/after comparison table, shop branding, disclaimer text, QR code placeholder; "Export / Share" button (copies shareable link or shows modal)
- **Tab 5 — Safety Flags**: Form to log a safety event (event type dropdown: Knock Spike, AFR Swing, Boost Creep, Dangerous Temp, Wrong Fuel, Over-Rev; severity: Warning/Critical; notes); flag list with color-coded severity badges; read-only customer explanation section
- All data stored in localStorage keyed by session so it persists between visits
- Navigation: top horizontal tab bar within the page (Sessions, Comparison, TuneVault, Reports, Safety)

### Modify
- DynoOSPage.tsx: replace the static marketing-only page with the Pro-gated functional TunerOS platform
- Non-Pro view: keep the marketing content (hero, problem section, feature cards) but add a prominent "Pro Required" lock overlay at the top and an upgrade CTA button; hide the tab interface
- Pro view: replace "Coming Soon" CTA with the full tabbed application

### Remove
- The static "Coming Soon — Join the Waitlist" CTA in the Pro view (replaced by live feature tabs)

## Implementation Plan
1. Replace DynoOSPage.tsx with a Pro-gated version:
   - Import `useInternetIdentity`, `useUserMeta`, `isUserPro` (same as GamePage)
   - If non-Pro: render existing hero + features marketing content + lock banner + upgrade CTA (Link to /pro)
   - If Pro: render full TunerOS tabbed platform
2. Build TunerOS tab interface inside the Pro view:
   - Top sticky tab bar: Sessions | Comparison | TuneVault | Reports | Safety
   - Each tab is a self-contained functional section
3. Tab 1 — Sessions:
   - localStorage key: `tuner_sessions`
   - Create session modal/form: VIN, vehicle name, fuel type (E85/93oct/91oct/E30/Race), boost target (psi), weather (temp °F, humidity %), mods (free-text list)
   - Session cards list: vehicle name, date, run count, status badge (Active/Complete)
   - Click session → expand inline to show run log
   - Run log: add run button → form (run #, peak HP, peak TQ, AFR, notes); run list as compact table rows
4. Tab 2 — Comparison:
   - Select Session A and Session B (dropdowns from sessions list)
   - Select Run from each session
   - Comparison table: HP delta, TQ delta, % change; color-coded cells
   - Summary verdict row: Net Gain / Loss
5. Tab 3 — TuneVault:
   - localStorage key: `tuner_vault`
   - Version list: filename, version label (v1, v2...), date, change notes, status (Active/Revoked)
   - Add Version form: filename input, change notes textarea, auto-increments version number
   - Toggle Active/Revoked per entry with color-coded badge
6. Tab 4 — Reports:
   - Select a session from dropdown
   - Form: customer name, shop name, before run, after run
   - Report preview card: shop name header, vehicle info, mod list, power table (before/after/delta), QR code placeholder div, disclaimer text
   - "Copy Share Link" button → copies `window.location.href + '#report'` with toast confirmation
7. Tab 5 — Safety Flags:
   - localStorage key: `tuner_safety`
   - Log event form: event type (Knock Spike/AFR Swing/Boost Creep/Dangerous Temp/Wrong Fuel/Over-Rev), severity (Warning/Critical), session link (optional dropdown), notes
   - Flags list: color badge (Warning=yellow, Critical=red), event type, date, notes
   - Customer explanation section: read-only card explaining what each flag type means in plain language
8. Apply deterministic data-ocid markers to all interactive surfaces
9. Validate: typecheck, lint, build pass
