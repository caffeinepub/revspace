/**
 * Local-storage cache for user profile data.
 * This is a backup layer so display names and avatars are never lost
 * even if the backend canister is redeployed or cold-starting.
 */

export interface CachedProfile {
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  location: string;
}

function cacheKey(principalId: string) {
  return `revspace_profile_${principalId}`;
}

function backupCacheKey(principalId: string) {
  return `revspace_profile_backup_${principalId}`;
}

export function getCachedProfile(principalId: string): CachedProfile | null {
  try {
    const raw = localStorage.getItem(cacheKey(principalId));
    if (raw) return JSON.parse(raw) as CachedProfile;
    // Primary key missing — check backup key and restore primary from it
    const backup = localStorage.getItem(backupCacheKey(principalId));
    if (backup) {
      localStorage.setItem(cacheKey(principalId), backup);
      return JSON.parse(backup) as CachedProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export function setCachedProfile(
  principalId: string,
  profile: CachedProfile,
): void {
  try {
    const serialized = JSON.stringify(profile);
    localStorage.setItem(cacheKey(principalId), serialized);
    localStorage.setItem(backupCacheKey(principalId), serialized);
  } catch {
    // silently ignore storage quota errors
  }
}

/**
 * Merge a backend profile with the local cache, preferring non-empty values.
 * This ensures that if the backend loses avatar/banner URLs (e.g. after a
 * canister reset), the local cache fills them back in.
 *
 * Critical: empty strings from backend should be treated as missing —
 * fall back to cache values for any field that is empty/blank in backend.
 */
export function mergeWithCache(
  principalId: string,
  backendProfile: CachedProfile,
): CachedProfile {
  const cached = getCachedProfile(principalId);
  if (!cached) return backendProfile;

  const trimmed = (s: string) => (s ?? "").trim();

  const backendLocation = trimmed(backendProfile.location);
  const cachedLocation = cached.location ?? "";

  // For the location field: the backend value is always authoritative when
  // non-empty, because it carries the __meta__ encoded Pro/RevBucks/Model
  // status. Only fall back to the cache when the backend returns nothing.
  // We must NOT let a cached plain-text location overwrite an on-chain
  // __meta__ string — that would silently erase Pro status.
  const mergedLocation = backendLocation || cachedLocation;

  return {
    // Prefer backend value if it has actual content, otherwise fall back to cache
    displayName: trimmed(backendProfile.displayName) || cached.displayName,
    bio: trimmed(backendProfile.bio) || cached.bio,
    avatarUrl: trimmed(backendProfile.avatarUrl) || cached.avatarUrl,
    bannerUrl: trimmed(backendProfile.bannerUrl) || cached.bannerUrl,
    location: mergedLocation,
  };
}

export function clearCachedProfile(principalId: string): void {
  localStorage.removeItem(cacheKey(principalId));
}
