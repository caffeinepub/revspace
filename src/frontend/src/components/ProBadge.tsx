import { Crown } from "lucide-react";
import { useUserMeta } from "../hooks/useUserMeta";
import { isUserPro } from "../lib/pro";

/**
 * Inline gold crown badge shown next to a user's display name when they are a Pro member.
 * Checks BOTH on-chain meta (authoritative) and localStorage (instant fallback while loading).
 */
export function ProBadge() {
  const { meta } = useUserMeta();
  // Show crown if either on-chain OR localStorage says Pro
  const isPro = meta.isPro || isUserPro();
  if (!isPro) return null;

  return (
    <Crown
      size={14}
      aria-label="RevSpace Pro"
      style={{ color: "oklch(0.82 0.18 85)", display: "inline", flexShrink: 0 }}
    />
  );
}
