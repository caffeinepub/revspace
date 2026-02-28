/**
 * localStorage-backed draft autosave for post creation.
 * Drafts auto-expire after 48 hours and are keyed per user principal.
 */

export interface PostDraft {
  content: string;
  postType: string;
  topic: string;
  savedAt: number; // Date.now()
  principalId: string;
}

const DRAFT_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

function draftKey(principalId: string): string {
  return `revspace_draft_${principalId}`;
}

/**
 * Save a draft for a specific user.
 * Overwrites any existing draft for this user.
 */
export function saveDraft(
  principalId: string,
  draft: Omit<PostDraft, "savedAt" | "principalId">,
): void {
  if (!principalId) return;
  const full: PostDraft = {
    ...draft,
    principalId,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(draftKey(principalId), JSON.stringify(full));
  } catch {
    // localStorage might be full — silently ignore
  }
}

/**
 * Get the most recent draft for a user.
 * Returns null if no draft exists or if it is older than 48 hours.
 */
export function getDraft(principalId: string): PostDraft | null {
  if (!principalId) return null;
  try {
    const raw = localStorage.getItem(draftKey(principalId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as PostDraft;
    if (Date.now() - draft.savedAt > DRAFT_TTL_MS) {
      // Draft expired — clean up and return null
      localStorage.removeItem(draftKey(principalId));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

/**
 * Clear the draft after successful publish or user cancel.
 */
export function clearDraft(principalId: string): void {
  if (!principalId) return;
  try {
    localStorage.removeItem(draftKey(principalId));
  } catch {
    // ignore
  }
}

/**
 * Check if there is a resumable draft for this user.
 */
export function hasDraft(principalId: string): boolean {
  return getDraft(principalId) !== null;
}
