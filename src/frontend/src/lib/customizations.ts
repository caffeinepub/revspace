/**
 * RevSpace user customizations — reaction packs, flair/title, and club membership.
 * All state is stored in localStorage.
 */

// ─── Reaction Pack ─────────────────────────────────────────────────────────────

const reactionPackKey = (principalId: string) =>
  `revspace_reaction_pack_${principalId}`;

/** Returns true if the user has unlocked the reaction pack. */
export function hasReactionPack(principalId: string): boolean {
  if (!principalId) return false;
  return localStorage.getItem(reactionPackKey(principalId)) === "1";
}

/** Unlocks the reaction pack for the user. */
export function unlockReactionPack(principalId: string): void {
  if (!principalId) return;
  localStorage.setItem(reactionPackKey(principalId), "1");
}

// ─── Title / Flair ─────────────────────────────────────────────────────────────

export const FLAIR_OPTIONS = [
  "Track Day King",
  "Boost Addict",
  "JDM Loyalist",
  "Stance God",
  "Sleeper Build",
  "Boost Junkie",
  "Weekend Warrior",
  "Daily Driver Killer",
  "Turbo Life",
  "Naturally Aspirated",
  "Drift King",
  "Build > Buy",
] as const;

export type FlairOption = (typeof FLAIR_OPTIONS)[number];

const flairKey = (principalId: string) => `revspace_flair_${principalId}`;

/** Returns the user's selected flair, or null if none. */
export function getUserFlair(principalId: string): string | null {
  if (!principalId) return null;
  return localStorage.getItem(flairKey(principalId));
}

/** Saves the user's flair selection. */
export function setUserFlair(principalId: string, flair: string): void {
  if (!principalId) return;
  localStorage.setItem(flairKey(principalId), flair);
}

/** Clears the user's flair. */
export function clearUserFlair(principalId: string): void {
  if (!principalId) return;
  localStorage.removeItem(flairKey(principalId));
}

// ─── Club Membership ───────────────────────────────────────────────────────────

const clubKey = (principalId: string) => `revspace_club_${principalId}`;

/** Returns the name of the club the user belongs to, or null. */
export function getUserClub(principalId: string): string | null {
  if (!principalId) return null;
  return localStorage.getItem(clubKey(principalId));
}

/** Saves the user's club membership (by name). */
export function setUserClub(principalId: string, clubName: string): void {
  if (!principalId) return;
  localStorage.setItem(clubKey(principalId), clubName);
}

/** Clears the user's club membership. */
export function clearUserClub(principalId: string): void {
  if (!principalId) return;
  localStorage.removeItem(clubKey(principalId));
}
