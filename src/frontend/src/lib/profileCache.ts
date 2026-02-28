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

export function getCachedProfile(principalId: string): CachedProfile | null {
  try {
    const raw = localStorage.getItem(cacheKey(principalId));
    if (!raw) return null;
    return JSON.parse(raw) as CachedProfile;
  } catch {
    return null;
  }
}

export function setCachedProfile(
  principalId: string,
  profile: CachedProfile,
): void {
  try {
    localStorage.setItem(cacheKey(principalId), JSON.stringify(profile));
  } catch {
    // silently ignore storage quota errors
  }
}

/**
 * Merge a backend profile with the local cache, preferring non-empty values.
 * This ensures that if the backend loses avatar/banner URLs (e.g. after a
 * canister reset), the local cache fills them back in.
 */
export function mergeWithCache(
  principalId: string,
  backendProfile: CachedProfile,
): CachedProfile {
  const cached = getCachedProfile(principalId);
  if (!cached) return backendProfile;

  return {
    displayName: backendProfile.displayName || cached.displayName,
    bio: backendProfile.bio || cached.bio,
    avatarUrl: backendProfile.avatarUrl || cached.avatarUrl,
    bannerUrl: backendProfile.bannerUrl || cached.bannerUrl,
    location: backendProfile.location || cached.location,
  };
}

export function clearCachedProfile(principalId: string): void {
  localStorage.removeItem(cacheKey(principalId));
}
