/**
 * RevSpace Pro membership utilities.
 * Pro status is tracked in localStorage for instant access.
 */

const PRO_KEY = "revspace_pro";

export function isUserPro(): boolean {
  return localStorage.getItem(PRO_KEY) === "true";
}

export function setUserPro(): void {
  localStorage.setItem(PRO_KEY, "true");
}
