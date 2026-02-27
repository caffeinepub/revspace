import { useState } from "react";
import { Trophy } from "lucide-react";
import { useGetAllPosts } from "../hooks/useQueries";
import { truncatePrincipal } from "../utils/format";
import { Skeleton } from "@/components/ui/skeleton";

type SortMode = "posts" | "likes";

interface LeaderEntry {
  principal: string;
  postCount: number;
  likeCount: number;
}

function computeLeaderboard(posts: Array<{ author: { toString(): string }; likes: unknown[] }>): LeaderEntry[] {
  const map = new Map<string, LeaderEntry>();

  for (const post of posts) {
    const key = post.author.toString();
    const existing = map.get(key);
    if (existing) {
      existing.postCount += 1;
      existing.likeCount += post.likes.length;
    } else {
      map.set(key, {
        principal: key,
        postCount: 1,
        likeCount: post.likes.length,
      });
    }
  }

  return Array.from(map.values());
}

const MEDAL_COLORS = [
  { bg: "oklch(0.8 0.18 85)", text: "oklch(0.15 0.05 85)", label: "Gold" },
  { bg: "oklch(0.75 0.05 240)", text: "oklch(0.15 0.02 240)", label: "Silver" },
  { bg: "oklch(0.65 0.12 45)", text: "oklch(0.15 0.04 45)", label: "Bronze" },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const medal = MEDAL_COLORS[rank - 1];
    return (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
        style={{ background: medal.bg, color: medal.text }}
      >
        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
      </div>
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{
        background: "oklch(var(--surface-elevated))",
        color: "oklch(var(--steel-light))",
      }}
    >
      {rank}
    </div>
  );
}

export function LeaderboardPage() {
  const [sortMode, setSortMode] = useState<SortMode>("posts");
  const { data: posts, isLoading } = useGetAllPosts();

  const entries = posts ? computeLeaderboard(posts) : [];

  const sorted = [...entries]
    .sort((a, b) =>
      sortMode === "posts"
        ? b.postCount - a.postCount || b.likeCount - a.likeCount
        : b.likeCount - a.likeCount || b.postCount - a.postCount
    )
    .slice(0, 20);

  const topEntry = sorted[0];
  const maxValue = topEntry
    ? sortMode === "posts"
      ? topEntry.postCount
      : topEntry.likeCount
    : 1;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="page-header">
        <div className="flex items-center gap-2">
          <Trophy size={20} style={{ color: "oklch(0.8 0.18 85)" }} />
          <h1 className="font-display text-2xl font-bold">Leaderboard</h1>
        </div>
      </header>

      {/* Sort Tabs */}
      <div className="px-4 pt-4 pb-2 flex gap-2">
        {(["posts", "likes"] as SortMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setSortMode(mode)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-all"
            style={
              sortMode === mode
                ? { background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }
                : {
                    background: "oklch(var(--surface))",
                    color: "oklch(var(--steel-light))",
                    border: "1px solid oklch(var(--border))",
                  }
            }
          >
            {mode === "posts" ? "Most Posts" : "Most Likes"}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="px-4 pb-3 text-xs" style={{ color: "oklch(var(--steel-light))" }}>
        Top {sortMode === "posts" ? "posters" : "liked creators"} across RevSpace
      </p>

      {/* List */}
      <div className="px-4 pb-6 space-y-2">
        {isLoading ? (
          (["sk1","sk2","sk3","sk4","sk5","sk6","sk7","sk8"] as const).map((k) => (
            <div
              key={k}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "oklch(var(--surface))", border: "1px solid oklch(var(--border))" }}
            >
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-2/5 rounded" />
                <Skeleton className="h-2 w-3/5 rounded" />
              </div>
              <Skeleton className="h-2 w-12 rounded" />
            </div>
          ))
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <Trophy size={36} className="mx-auto mb-3" style={{ color: "oklch(var(--steel))" }} />
            <p className="text-sm" style={{ color: "oklch(var(--steel-light))" }}>
              No posts yet — be the first to climb the ranks!
            </p>
          </div>
        ) : (
          sorted.map((entry, idx) => {
            const rank = idx + 1;
            const value = sortMode === "posts" ? entry.postCount : entry.likeCount;
            const barWidth = maxValue > 0 ? Math.max(4, Math.round((value / maxValue) * 100)) : 4;
            const isTop3 = rank <= 3;

            return (
              <div
                key={entry.principal}
                className="relative flex items-center gap-3 p-3 rounded-xl overflow-hidden transition-all"
                style={{
                  background: isTop3 ? "oklch(var(--surface))" : "oklch(var(--surface))",
                  border: isTop3
                    ? `1px solid ${MEDAL_COLORS[rank - 1].bg}`
                    : "1px solid oklch(var(--border))",
                  boxShadow: isTop3
                    ? `0 0 12px ${MEDAL_COLORS[rank - 1].bg}30`
                    : "none",
                }}
              >
                {/* Progress bar background */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    width: `${barWidth}%`,
                    background: isTop3
                      ? `${MEDAL_COLORS[rank - 1].bg}18`
                      : "oklch(var(--orange) / 0.06)",
                    transition: "width 0.5s ease",
                  }}
                />

                {/* Rank */}
                <RankBadge rank={rank} />

                {/* User info */}
                <div className="flex-1 min-w-0 relative">
                  <p className="text-sm font-semibold text-foreground font-mono truncate">
                    {truncatePrincipal(entry.principal)}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px]" style={{ color: "oklch(var(--steel-light))" }}>
                      {entry.postCount} {entry.postCount === 1 ? "post" : "posts"}
                    </span>
                    <span className="text-[11px]" style={{ color: "oklch(var(--steel-light))" }}>
                      ♥ {entry.likeCount} {entry.likeCount === 1 ? "like" : "likes"}
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right relative shrink-0">
                  <p
                    className="text-lg font-black font-display"
                    style={{
                      color: isTop3
                        ? MEDAL_COLORS[rank - 1].bg
                        : "oklch(var(--orange-bright))",
                    }}
                  >
                    {value}
                  </p>
                  <p className="text-[10px]" style={{ color: "oklch(var(--steel))" }}>
                    {sortMode === "posts" ? "posts" : "likes"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-xs border-t mt-4" style={{ color: "oklch(var(--steel-light))", borderColor: "oklch(var(--border))" }}>
        © 2026. Built with ❤️ using{" "}
        <a
          href="https://caffeine.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange hover:underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
