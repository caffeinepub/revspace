/**
 * Local-storage cache for feed posts.
 *
 * Acts as a backup layer so the feed never goes blank while the ICP canister
 * actor is initializing (common after a fresh deploy or canister cold-start).
 *
 * Strategy:
 *  - After every successful getAllPosts call, write the result here.
 *  - On the next load, serve cached posts immediately so the feed shows
 *    content while the actor catches up.
 *  - Cached posts are replaced (not merged) each time a fresh result arrives.
 *  - Entries older than 48 hours are considered stale and silently discarded.
 */

const CACHE_KEY = "revspace_posts_cache";
const BACKUP_KEY = "revspace_posts_cache_backup";
const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours

interface PostCacheEntry {
  posts: unknown[];
  savedAt: number; // Date.now()
}

export function getCachedPosts(): unknown[] | null {
  for (const key of [CACHE_KEY, BACKUP_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const entry = JSON.parse(raw) as PostCacheEntry;
      if (
        Array.isArray(entry.posts) &&
        entry.posts.length > 0 &&
        Date.now() - entry.savedAt < MAX_AGE_MS
      ) {
        // Restore primary key from backup if needed
        if (key === BACKUP_KEY) {
          try {
            localStorage.setItem(CACHE_KEY, raw);
          } catch {
            // ignore quota errors
          }
        }
        return entry.posts;
      }
    } catch {
      // corrupt entry — skip
    }
  }
  return null;
}

export function setCachedPosts(posts: unknown[]): void {
  if (!Array.isArray(posts) || posts.length === 0) return;
  try {
    const serialized = JSON.stringify({ posts, savedAt: Date.now() });
    localStorage.setItem(CACHE_KEY, serialized);
    localStorage.setItem(BACKUP_KEY, serialized);
  } catch {
    // silently ignore storage quota errors
  }
}
