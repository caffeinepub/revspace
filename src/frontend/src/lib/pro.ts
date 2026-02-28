/**
 * RevSpace Pro membership utilities.
 * Pro status is tracked in localStorage for instant access.
 * Written to TWO keys so it survives independent cache-clear events.
 */

const PRO_KEY = "revspace_pro";
const PRO_KEY_V2 = "revspace_pro_v2";

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
