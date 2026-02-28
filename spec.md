# RevSpace

## Current State
Full-stack car enthusiast social platform with feed, reels, marketplace, garage, events, clubs, messaging, notifications, leaderboard, mechanics Q&A, forum, admin panel, and shop page. Settings page has profile editing (name, bio, location, avatar, banner). No Pro/subscription tier exists yet.

## Requested Changes (Diff)

### Add
- "RevSpace Pro" upgrade section in Settings page with a prominent upgrade button
- Pro upgrade modal/card that shows what Pro includes (verified badge, ad-free, priority in leaderboard, extended video, exclusive Pro badge)
- Clicking "Upgrade to Pro" redirects to Stripe payment link: https://buy.stripe.com/bJe9AUd3V0kIfpjcFp9EI00
- Pro badge display on profiles for users who have upgraded (tracked via localStorage flag `revspace_pro` set after returning from Stripe)
- After Stripe redirect returns (detect via URL param `?pro=success`), set local pro flag and show a congratulations toast/banner
- Pro badge (crown or star icon) next to display name in: Profile page, UserProfilePage, Reels, Feed posts, Leaderboard

### Modify
- SettingsPage: Add a "RevSpace Pro" card section below the Save Profile button, showing current status (free vs pro) and upgrade CTA
- ProfilePage: Show Pro badge next to name if user is Pro

### Remove
- Nothing removed
