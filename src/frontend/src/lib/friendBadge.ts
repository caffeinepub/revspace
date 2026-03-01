/**
 * "Friends with Creator" badge utilities.
 * Badge status is tracked per-principal in localStorage using dual-key
 * resilience (same pattern as pro.ts) so it survives independent cache-clear events.
 */

const KEY = (p: string) => `revspace_friend_badge_${p}`;
const KEY2 = (p: string) => `revspace_friend_badge_v2_${p}`;

export function isFriendOfCreator(principalStr: string): boolean {
  if (!principalStr) return false;
  const primary = localStorage.getItem(KEY(principalStr)) === "true";
  const backup = localStorage.getItem(KEY2(principalStr)) === "true";
  // If either key has badge status, restore the other and return true
  if (primary && !backup) {
    localStorage.setItem(KEY2(principalStr), "true");
    return true;
  }
  if (backup && !primary) {
    localStorage.setItem(KEY(principalStr), "true");
    return true;
  }
  return primary;
}

export function setFriendOfCreator(principalStr: string): void {
  if (!principalStr) return;
  localStorage.setItem(KEY(principalStr), "true");
  localStorage.setItem(KEY2(principalStr), "true");
}
