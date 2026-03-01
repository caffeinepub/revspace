import { Sparkles } from "lucide-react";
import { isFriendOfCreator } from "../lib/friendBadge";

interface FriendBadgeProps {
  principalStr: string;
}

/**
 * Inline sparkle badge shown next to a user's display name when they
 * have the "Friends with Creator" status.
 * Distinct from the gold crown (Pro) and purple MODEL badge.
 */
export function FriendBadge({ principalStr }: FriendBadgeProps) {
  if (!isFriendOfCreator(principalStr)) return null;

  return (
    <Sparkles
      size={14}
      aria-label="Friends with Creator"
      style={{
        color: "oklch(0.72 0.18 290)",
        display: "inline",
        flexShrink: 0,
      }}
    />
  );
}
