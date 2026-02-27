# RevSpace

## Current State
Full-stack car enthusiast social platform with: feed posts, reels, garage, events (car meets), marketplace, clubs, leaderboard, messaging, notifications, shop page, SEO, and PWA support.

Events currently support: create, list, RSVP/un-RSVP. No delete event, no cover image upload (URL only).
Reels currently support: upload video (any type), like, comment, delete. No topic/category tagging on reels.
Posts/Reels: postType is a free-text string with no enum constraint enforced in the UI.

## Requested Changes (Diff)

### Add
- `deleteEvent(eventId: Text)` backend function — only creator or admin can delete
- `addEventPhoto(eventId: Text, photoUrl: Text)` backend function — add photos to a meet after creation
- `getEventPhotos(eventId: Text)` backend query — return array of photo URLs for an event
- Event cover image upload (file picker) in the CreateEventModal instead of URL text field
- Delete button on event cards/detail modal (only visible to event creator)
- Event photo gallery section in EventDetailModal — view and add photos
- `topic` field on Post type (Text) — reel categories (e.g. "Street Drift", "Car Show", "Track Day", "Burnout", "Stance", "JDM Build", "Muscle", "Import", "Other")
- Topic/category selector when creating a Reel in CreatePostPage
- Topic badge displayed on each reel card in ReelsPage
- Topic filter bar at the top of ReelsPage to filter reels by topic

### Modify
- `createPost` backend — add `topic: Text` parameter
- `PostView` type — add `topic: Text` field
- `Post` type — add `topic: Text` field
- `Event` type — add `photos: List.List<Text>` field
- `EventView` type — add `photos: [Text]` field
- EventsPage CreateEventModal — replace URL input with file upload picker
- EventsPage EventDetailModal — add photo gallery + "Add Photo" upload button (only for creator/attendees)
- EventsPage event cards — show delete button for creator
- ReelsPage — show topic badge on each reel, add topic filter bar at top

### Remove
- Nothing removed

## Implementation Plan
1. Update Motoko backend:
   - Add `topic` field to Post/PostView types
   - Update `createPost` to accept `topic` parameter
   - Add `photos` field to Event/EventView types
   - Add `deleteEvent` function (creator or admin only)
   - Add `addEventPhoto` and `getEventPhotos` functions
2. Update frontend:
   - Update `useCreatePost` hook to pass `topic`
   - Add `useDeleteEvent`, `useAddEventPhoto`, `useGetEventPhotos` hooks
   - Update CreatePostPage — add topic selector for Reel type
   - Update ReelsPage — show topic badge, add topic filter bar
   - Update EventsPage:
     - CreateEventModal: replace URL field with image file upload
     - EventDetailModal: add photo gallery with upload button (creator/attendee)
     - Event cards: show trash icon for creator with confirm-delete flow
