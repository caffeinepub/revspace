import { Crown } from "lucide-react";
import { isUserPro } from "../lib/pro";

/**
 * Inline gold crown badge shown next to a user's display name when they are a Pro member.
 * Only visible for the current user (Pro status is stored in localStorage).
 */
export function ProBadge() {
  if (!isUserPro()) return null;

  return (
    <Crown
      size={14}
      aria-label="RevSpace Pro"
      style={{ color: "oklch(0.82 0.18 85)", display: "inline", flexShrink: 0 }}
    />
  );
}
