/**
 * RevSpace Pro membership utilities.
 * Primary source of truth: on-chain profile via useUserMeta hook.
 * Fallback: localStorage for instant reads while profile loads.
 * Written to TWO keys so it survives independent cache-clear events.
 */
import type { UserMetaData } from "./userMeta";

const PRO_KEY = "revspace_pro";
const PRO_KEY_V2 = "revspace_pro_v2";

/** Read Pro status from already-decoded on-chain meta. */
export function isUserProFromMeta(meta: UserMetaData): boolean {
  return meta.isPro;
}

export function isUserPro(): boolean {
  const primary = localStorage.getItem(PRO_KEY) === "true";
  const backup = localStorage.getItem(PRO_KEY_V2) === "true";
  // If either key has pro status, restore the other and return true
  if (primary && !backup) {
    localStorage.setItem(PRO_KEY_V2, "true");
    return true;
  }
  if (backup && !primary) {
    localStorage.setItem(PRO_KEY, "true");
    return true;
  }
  return primary;
}

export function setUserPro(): void {
  localStorage.setItem(PRO_KEY, "true");
  localStorage.setItem(PRO_KEY_V2, "true");
}
