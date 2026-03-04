# RevSpace

## Current State
Full-stack social media platform for car enthusiasts. Reels, feed, and all public-read pages are broken after deploys because `useActor.ts` awaits `_initializeAccessControlWithSecret` inside the React Query `queryFn`. If that call fails or throws (which it can after a fresh deploy or canister cold-start), `actorQuery.data` stays null and every downstream query that checks `!!actor` never fires — causing Reels, Feed, profiles, and everything else to stay blank/broken.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- `useActor.ts`: Build the actor first, then fire `_initializeAccessControlWithSecret` as a background/fire-and-forget call. Return the actor immediately once built so downstream queries are not blocked by the auth init call.
- `useActor.ts`: Also handle the case where the actor query builds but `_initializeAccessControlWithSecret` throws — ensure the actor is still returned to callers so public reads work.

### Remove
- Blocking `await actor._initializeAccessControlWithSecret(adminToken)` from the React Query `queryFn` — move it to a non-blocking background call

## Implementation Plan
1. In `useActor.ts` queryFn: build the actor, then fire `_initializeAccessControlWithSecret` in the background (no await), and immediately return the actor. This ensures the actor is always available for public reads even if auth init is slow or throws.
2. Re-verify `useRegisteredActor.ts` still does its own registration call (it does — it calls `_initializeAccessControlWithSecret("")` in a useEffect after the actor is received), so write mutations remain gated behind registration.
