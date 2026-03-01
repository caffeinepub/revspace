/**
 * Extended user metadata encoded into the profile `location` field.
 *
 * Format: __meta__{"rb":550,"isPro":true,"isModel":true,...,"loc":"Los Angeles, CA"}
 *
 * When the location field does NOT start with __meta__, it is treated as a
 * plain location string (backward-compatible).
 */

export interface UserMetaData {
  rb: number; // RevBucks balance
  isPro: boolean; // Pro membership
  isModel: boolean; // Model account
  modelSpecialty: string;
  modelSocialHandle: string;
  modelBookingContact: string;
  modelYearsActive: string;
  loc: string; // the real location string visible to users
}

const META_PREFIX = "__meta__";

const DEFAULT_META: UserMetaData = {
  rb: 0,
  isPro: false,
  isModel: false,
  modelSpecialty: "Just here for the vibes 🌟",
  modelSocialHandle: "",
  modelBookingContact: "",
  modelYearsActive: "",
  loc: "",
};

/**
 * Encode a UserMetaData object into the location field string.
 */
export function encodeMetaToLocation(meta: UserMetaData): string {
  return META_PREFIX + JSON.stringify(meta);
}

/**
 * Decode the location field string into a UserMetaData object.
 * If the field is a plain string (no prefix), returns defaults with loc set.
 */
export function decodeMetaFromLocation(location: string): UserMetaData {
  if (!location) {
    return { ...DEFAULT_META };
  }

  if (!location.startsWith(META_PREFIX)) {
    // Plain location — no extended meta yet
    return { ...DEFAULT_META, loc: location };
  }

  try {
    const json = location.slice(META_PREFIX.length);
    const parsed = JSON.parse(json) as Partial<UserMetaData>;
    return { ...DEFAULT_META, ...parsed };
  } catch {
    return { ...DEFAULT_META };
  }
}

/**
 * Return the human-readable location string, stripping the __meta__ prefix.
 * Safe to call on any profile.location value.
 */
export function getDisplayLocation(
  location: string | null | undefined,
): string {
  if (!location) return "";
  return decodeMetaFromLocation(location).loc;
}
