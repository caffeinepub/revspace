import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Principal } from "@icp-sdk/core/principal";
import { Link } from "@tanstack/react-router";
import {
  Clapperboard,
  Film,
  Heart,
  MessageCircle,
  Settings,
  Share2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { VideoPlayer } from "../components/VideoPlayer";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAuthorClubName,
  useGetAllPosts,
  useGetProfile,
  useLikePost,
  useUnlikePost,
} from "../hooks/useQueries";
import { useUserMeta } from "../hooks/useUserMeta";
import { decodeMetaFromLocation } from "../lib/userMeta";
import { timeAgo, truncatePrincipal } from "../utils/format";

const MODEL_SPECIALTIES = ["All", "JDM", "Euro", "Stance", "Muscle", "Other"];

// Number of cards to keep rendered (VideoPlayer active/adjacent/etc.)
// Cards outside this window render as poster-only img elements.
const RENDER_WINDOW = 2;

// ─── Hook: check if a profile's location encodes isModel: true ────────────────
function useIsModelAuthor(author: Principal | undefined) {
  const { data: profile } = useGetProfile(author);
  if (!profile) return null;
  const meta = decodeMetaFromLocation(profile.location ?? "");
  return meta.isModel;
}

// ─── Author row for model reels ───────────────────────────────────────────────
function ModelReelAuthor({ author }: { author: Principal }) {
  const { data: profile } = useGetProfile(author);
  const displayName =
    profile?.displayName ?? truncatePrincipal(author.toString());
  const avatarUrl = profile?.avatarUrl ?? "";
  const clubName = useAuthorClubName(author.toString());

  return (
    <Link
      to="/profile/$userId"
      params={{ userId: author.toString() }}
      className="flex items-center gap-2 group"
    >
      <Avatar className="w-8 h-8 border border-purple-400/50">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
        <AvatarFallback
          className="text-xs"
          style={{ background: "oklch(0.3 0.12 310)", color: "white" }}
        >
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground group-hover:underline underline-offset-2">
            {displayName}
          </span>
          <span
            className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full tracking-wide"
            style={{
              background: "oklch(0.3 0.15 310 / 0.5)",
              color: "oklch(0.82 0.2 310)",
              border: "1px solid oklch(0.55 0.2 310 / 0.5)",
            }}
          >
            MODEL
          </span>
        </div>
        {clubName && (
          <span
            className="inline-flex items-center gap-0.5 font-bold italic tracking-widest uppercase leading-none"
            style={{
              fontSize: "9px",
              background:
                "linear-gradient(90deg, oklch(0.7 0.18 45), oklch(0.75 0.2 50))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            <span style={{ WebkitTextFillColor: "oklch(0.7 0.18 45)" }}>
              ⚡
            </span>
            {clubName}
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── Post type definition ─────────────────────────────────────────────────────
interface ModelPost {
  id: string;
  postType: string;
  topic: string;
  content: string;
  author: Principal;
  likes: Principal[];
  timestamp: bigint;
  mediaUrls: string[];
  comments: string[];
}

// ─── Video card with lazy VideoPlayer ────────────────────────────────────────
interface ModelVideoCardProps {
  post: ModelPost;
  isMuted: boolean;
  onToggleMute: () => void;
  myPrincipal?: string;
  isActive: boolean;
  isAdjacent: boolean;
  cardRef?: (el: HTMLDivElement | null) => void;
  index: number;
}

function ModelVideoCard({
  post,
  isMuted,
  onToggleMute,
  myPrincipal,
  isActive,
  isAdjacent,
  cardRef,
  index,
}: ModelVideoCardProps) {
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();

  const serverLiked = myPrincipal
    ? post.likes.some((l) => l.toString() === myPrincipal)
    : false;
  const isLiked = liked || serverLiked;

  const handleLike = () => {
    if (!myPrincipal) {
      toast.error("Sign in to like posts");
      return;
    }
    if (isLiked) {
      setLiked(false);
      unlikeMutation.mutate(post.id);
    } else {
      setLiked(true);
      likeMutation.mutate(post.id);
    }
  };

  const isVideo =
    post.postType?.toLowerCase() === "reel" ||
    post.postType?.toLowerCase() === "video";

  // thumbnail = mediaUrls[1], video = mediaUrls[0]
  const videoUrl = post.mediaUrls[0] ?? "";
  const thumbnailUrl = post.mediaUrls[1] ?? undefined;
  const inRenderWindow =
    isActive || isAdjacent || Math.abs(index) <= RENDER_WINDOW;

  return (
    <div
      ref={cardRef}
      data-post-id={post.id}
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: "oklch(var(--surface))",
        border: "1px solid oklch(0.35 0.1 310 / 0.4)",
        boxShadow: "0 0 20px oklch(0.5 0.15 310 / 0.1)",
      }}
    >
      {/* Media area */}
      <div className="relative aspect-[9/16] max-h-[520px] bg-black overflow-hidden">
        {isVideo && videoUrl ? (
          inRenderWindow ? (
            <VideoPlayer
              src={videoUrl}
              poster={thumbnailUrl}
              isActive={isActive}
              isAdjacent={isAdjacent}
              muted={isMuted}
              loop
              onTimeUpdate={(currentTime, duration) => {
                if (duration > 0) {
                  setProgress((currentTime / duration) * 100);
                }
              }}
              className="w-full h-full"
            />
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: "oklch(0.1 0.005 310)" }}
            />
          )
        ) : post.mediaUrls[0] ? (
          <img
            src={post.mediaUrls[0]}
            alt={post.content}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film size={40} style={{ color: "oklch(0.5 0.1 310)" }} />
          </div>
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, oklch(0 0 0 / 0.7) 0%, transparent 40%)",
          }}
        />

        {/* Progress bar */}
        {isVideo && (
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{ height: 3, background: "oklch(1 0 0 / 0.15)" }}
          >
            <div
              className="h-full transition-all duration-200"
              style={{
                width: `${progress}%`,
                background: "oklch(0.7 0.2 310)",
              }}
            />
          </div>
        )}

        {/* Sound toggle — only for videos */}
        {isVideo && (
          <button
            type="button"
            onClick={onToggleMute}
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-90"
            style={{ background: "oklch(0 0 0 / 0.55)" }}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <title>Muted</title>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <title>Sound on</title>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Info area */}
      <div className="p-4 space-y-3">
        {/* Author */}
        <ModelReelAuthor author={post.author} />

        {/* Topic badge */}
        {post.topic && (
          <span
            className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full"
            style={{
              background: "oklch(0.3 0.12 310 / 0.4)",
              color: "oklch(0.82 0.2 310)",
              border: "1px solid oklch(0.55 0.18 310 / 0.4)",
            }}
          >
            # {post.topic}
          </span>
        )}

        {/* Caption */}
        {post.content && (
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">
            {post.content}
          </p>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={handleLike}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{
              color: isLiked ? "oklch(0.7 0.22 27)" : "oklch(var(--steel))",
            }}
          >
            <Heart
              size={17}
              fill={isLiked ? "oklch(0.7 0.22 27)" : "none"}
              color={isLiked ? "oklch(0.7 0.22 27)" : "currentColor"}
            />
            <span>{post.likes.length}</span>
          </button>

          <div className="flex items-center gap-1.5 text-sm text-steel">
            <MessageCircle size={17} />
            <span>{post.comments.length}</span>
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-steel ml-auto"
          >
            <Share2 size={17} />
          </button>
        </div>

        {/* Timestamp */}
        <p className="text-[11px] text-steel">{timeAgo(post.timestamp)}</p>
      </div>
    </div>
  );
}

// ─── Model-gated wrapper ──────────────────────────────────────────────────────
function ModelReelCardGated({
  post,
  isMuted,
  onToggleMute,
  myPrincipal,
  isActive,
  isAdjacent,
  onConfirmModel,
  cardRef,
  index,
}: {
  post: ModelPost;
  isMuted: boolean;
  onToggleMute: () => void;
  myPrincipal?: string;
  isActive: boolean;
  isAdjacent: boolean;
  onConfirmModel: (authorId: string, isModel: boolean) => void;
  cardRef?: (el: HTMLDivElement | null) => void;
  index: number;
}) {
  const isModelAuthor = useIsModelAuthor(post.author);

  useEffect(() => {
    if (isModelAuthor !== null) {
      onConfirmModel(post.author.toString(), isModelAuthor);
    }
  }, [isModelAuthor, post.author, onConfirmModel]);

  if (isModelAuthor === false) return null;

  return (
    <ModelVideoCard
      post={post}
      isMuted={isMuted}
      onToggleMute={onToggleMute}
      myPrincipal={myPrincipal}
      isActive={isActive}
      isAdjacent={isAdjacent}
      cardRef={cardRef}
      index={index}
    />
  );
}

// ─── ModelReelsPage ────────────────────────────────────────────────────────────
export function ModelReelsPage() {
  const { data: posts, isLoading } = useGetAllPosts();
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [isMuted, setIsMuted] = useState(true);
  const { meta } = useUserMeta();
  const isMyAccountModel = meta.isModel;
  const [activeIndex, setActiveIndex] = useState(0);

  const [authorModelStatus, setAuthorModelStatus] = useState<
    Record<string, boolean>
  >({});

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleConfirmModel = useCallback(
    (authorId: string, isModel: boolean) => {
      setAuthorModelStatus((prev) => {
        if (prev[authorId] === isModel) return prev;
        return { ...prev, [authorId]: isModel };
      });
    },
    [],
  );

  const videoPosts = useMemo(
    () =>
      (posts ?? []).filter(
        (p) =>
          p.postType?.toLowerCase() === "reel" ||
          p.postType?.toLowerCase() === "video",
      ),
    [posts],
  );

  const topicFilteredPosts = useMemo(
    () =>
      selectedSpecialty === "All"
        ? videoPosts
        : videoPosts.filter(
            (p) => p.topic.toLowerCase() === selectedSpecialty.toLowerCase(),
          ),
    [videoPosts, selectedSpecialty],
  );

  const displayPosts = useMemo(
    () =>
      topicFilteredPosts.filter((p) => {
        const status = authorModelStatus[p.author.toString()];
        return status !== false;
      }),
    [topicFilteredPosts, authorModelStatus],
  );

  // IntersectionObserver for the grid layout
  const registerCard = useCallback(
    (postId: string, el: HTMLDivElement | null) => {
      if (el) cardRefs.current.set(postId, el);
      else cardRefs.current.delete(postId);
    },
    [],
  );

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
          const postId = (entry.target as HTMLElement).dataset.postId;
          if (!postId) continue;
          const idx = displayPosts.findIndex((p) => p.id === postId);
          if (idx >= 0) setActiveIndex(idx);
        }
      },
      { threshold: 0.5 },
    );

    for (const [, el] of cardRefs.current.entries()) {
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [displayPosts]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="page-header">
        <div className="flex items-center gap-2">
          <Clapperboard size={22} style={{ color: "oklch(0.72 0.2 310)" }} />
          <h1 className="font-display text-2xl font-bold">Model Reels</h1>
        </div>
        {isMyAccountModel && (
          <span
            className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wide"
            style={{
              background: "oklch(0.3 0.15 310 / 0.3)",
              color: "oklch(0.82 0.2 310)",
              border: "1px solid oklch(0.55 0.2 310 / 0.4)",
            }}
          >
            Model Account ✓
          </span>
        )}
      </header>

      <div className="px-4 pb-6">
        {/* Model-only notice */}
        {!isMyAccountModel && (
          <div
            className="rounded-xl p-4 mb-5 flex items-start gap-3"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.14 0.06 310 / 0.5), oklch(0.11 0.03 310 / 0.8))",
              border: "1px solid oklch(0.45 0.14 310 / 0.5)",
            }}
          >
            <span className="text-xl shrink-0">🎬</span>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold"
                style={{ color: "oklch(0.88 0.14 310)" }}
              >
                Only model accounts can post here
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "oklch(0.6 0.08 310)" }}
              >
                Switch to a Model Account in Settings to post your reels here.
              </p>
            </div>
            <Link to="/settings" className="shrink-0">
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all hover:brightness-110"
                style={{
                  background: "oklch(0.5 0.18 310 / 0.3)",
                  color: "oklch(0.82 0.2 310)",
                  border: "1px solid oklch(0.55 0.18 310 / 0.4)",
                }}
              >
                <Settings size={12} />
                Settings
              </button>
            </Link>
          </div>
        )}

        {/* Model account active banner */}
        {isMyAccountModel && (
          <div
            className="rounded-xl p-4 mb-5 flex items-center justify-between gap-3"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.2 0.1 310 / 0.4), oklch(0.15 0.06 310 / 0.6))",
              border: "1px solid oklch(0.5 0.18 310 / 0.4)",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎬</span>
              <p className="text-sm" style={{ color: "oklch(0.85 0.14 310)" }}>
                You're a Model Account — post your reels here
              </p>
            </div>
            <a href="/create?modelOnly=1" className="shrink-0">
              <button
                type="button"
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:brightness-110"
                style={{
                  background: "oklch(0.55 0.22 310)",
                  color: "white",
                  border: "none",
                }}
              >
                Post
              </button>
            </a>
          </div>
        )}

        {/* Specialty filter bar */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
          {MODEL_SPECIALTIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSelectedSpecialty(s);
                setActiveIndex(0);
              }}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={
                selectedSpecialty === s
                  ? {
                      background: "oklch(0.6 0.22 310)",
                      color: "white",
                      boxShadow: "0 0 12px oklch(0.6 0.22 310 / 0.4)",
                    }
                  : {
                      background: "oklch(var(--surface))",
                      color: "oklch(var(--steel))",
                      border: "1px solid oklch(var(--border))",
                    }
              }
            >
              {s}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="rounded-2xl overflow-hidden animate-pulse"
                style={{ background: "oklch(var(--surface))" }}
              >
                <div
                  className="aspect-[9/16] max-h-[360px]"
                  style={{ background: "oklch(0.18 0.02 260)" }}
                />
                <div className="p-4 space-y-2">
                  <div
                    className="h-3 rounded w-2/3"
                    style={{ background: "oklch(0.22 0.02 260)" }}
                  />
                  <div
                    className="h-3 rounded w-1/2"
                    style={{ background: "oklch(0.22 0.02 260)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && displayPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(0.2 0.08 310 / 0.4)" }}
            >
              <Film size={32} style={{ color: "oklch(0.6 0.18 310)" }} />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">
              {selectedSpecialty === "All"
                ? "No Model Reels Yet"
                : `No "${selectedSpecialty}" Reels`}
            </h3>
            <p className="text-steel text-sm mb-6 max-w-xs">
              {selectedSpecialty === "All"
                ? "Model accounts can upload reels from the Create Post page."
                : "Be the first model to upload a reel with this tag."}
            </p>
            {isMyAccountModel && (
              <a href="/create?modelOnly=1">
                <Button
                  style={{
                    background: "oklch(0.6 0.22 310)",
                    color: "white",
                  }}
                >
                  Upload Reel
                </Button>
              </a>
            )}
          </div>
        )}

        {/* Reel grid with lazy loading */}
        {!isLoading && topicFilteredPosts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topicFilteredPosts.map((post, idx) => (
              <ModelReelCardGated
                key={post.id}
                post={post}
                isMuted={isMuted}
                onToggleMute={() => setIsMuted((m) => !m)}
                myPrincipal={myPrincipal}
                isActive={idx === activeIndex}
                isAdjacent={Math.abs(idx - activeIndex) === 1}
                onConfirmModel={handleConfirmModel}
                cardRef={(el) => registerCard(post.id, el)}
                index={idx}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="py-8 text-center text-xs text-steel border-t border-border mt-4">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
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
