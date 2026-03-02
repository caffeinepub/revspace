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
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetAllPosts,
  useGetProfile,
  useLikePost,
  useUnlikePost,
} from "../hooks/useQueries";
import { useUserMeta } from "../hooks/useUserMeta";
import { decodeMetaFromLocation } from "../lib/userMeta";
import { timeAgo, truncatePrincipal } from "../utils/format";

const MODEL_SPECIALTIES = ["All", "JDM", "Euro", "Stance", "Muscle", "Other"];

// ─── Hook: check if a profile's location encodes isModel: true ────────────────
function useIsModelAuthor(author: Principal | undefined) {
  const { data: profile } = useGetProfile(author);
  if (!profile) return null; // null = still loading
  const meta = decodeMetaFromLocation(profile.location ?? "");
  return meta.isModel;
}

// ─── Author row for model reels ───────────────────────────────────────────────
function ModelReelAuthor({ author }: { author: Principal }) {
  const { data: profile } = useGetProfile(author);
  const displayName =
    profile?.displayName ?? truncatePrincipal(author.toString());
  const avatarUrl = profile?.avatarUrl ?? "";

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
      <span className="text-sm font-semibold text-foreground group-hover:underline underline-offset-2">
        {displayName}
      </span>
      {/* Purple MODEL badge */}
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
    </Link>
  );
}

// ─── Video card ───────────────────────────────────────────────────────────────
interface ModelVideoCardProps {
  post: {
    id: string;
    postType: string;
    topic: string;
    content: string;
    author: Principal;
    likes: Principal[];
    timestamp: bigint;
    mediaUrls: string[];
    comments: string[];
  };
  isMuted: boolean;
  onToggleMute: () => void;
  myPrincipal?: string;
}

function ModelVideoCard({
  post,
  isMuted,
  onToggleMute,
  myPrincipal,
}: ModelVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [liked, setLiked] = useState(false);
  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();

  const serverLiked = myPrincipal
    ? post.likes.some((l) => l.toString() === myPrincipal)
    : false;
  const isLiked = liked || serverLiked;

  // Sync muted on videoRef when isMuted changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

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

  const isVideo = post.postType === "Reel" || post.postType === "Video";
  const mediaUrl = post.mediaUrls[0];

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: "oklch(var(--surface))",
        border: "1px solid oklch(0.35 0.1 310 / 0.4)",
        boxShadow: "0 0 20px oklch(0.5 0.15 310 / 0.1)",
      }}
    >
      {/* Media area */}
      <div className="relative aspect-[9/16] max-h-[520px] bg-black overflow-hidden">
        {mediaUrl && !videoError ? (
          isVideo ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              autoPlay
              muted={isMuted}
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration > 0) {
                  setProgress((v.currentTime / v.duration) * 100);
                }
              }}
              onError={() => setVideoError(true)}
            >
              <track kind="captions" />
            </video>
          ) : (
            <img
              src={mediaUrl}
              alt={post.content}
              className="w-full h-full object-cover"
            />
          )
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
              <VolumeX size={16} color="white" />
            ) : (
              <Volume2 size={16} color="white" />
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

// ─── Model-gated wrapper: only renders if author is a model account ────────────
function ModelReelCardGated({
  post,
  isMuted,
  onToggleMute,
  myPrincipal,
  onConfirmModel,
}: {
  post: ModelVideoCardProps["post"];
  isMuted: boolean;
  onToggleMute: () => void;
  myPrincipal?: string;
  onConfirmModel: (authorId: string, isModel: boolean) => void;
}) {
  const isModelAuthor = useIsModelAuthor(post.author);

  useEffect(() => {
    if (isModelAuthor !== null) {
      onConfirmModel(post.author.toString(), isModelAuthor);
    }
  }, [isModelAuthor, post.author, onConfirmModel]);

  // Show card while still loading (optimistic), hide once confirmed non-model
  if (isModelAuthor === false) return null;

  return (
    <ModelVideoCard
      post={post}
      isMuted={isMuted}
      onToggleMute={onToggleMute}
      myPrincipal={myPrincipal}
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

  // Track which authors we've confirmed as model or non-model
  const [authorModelStatus, setAuthorModelStatus] = useState<
    Record<string, boolean>
  >({});

  const handleConfirmModel = (authorId: string, isModel: boolean) => {
    setAuthorModelStatus((prev) => {
      if (prev[authorId] === isModel) return prev; // no change
      return { ...prev, [authorId]: isModel };
    });
  };

  // Filter to video/reel posts only
  const videoPosts = useMemo(
    () =>
      (posts ?? []).filter(
        (p) => p.postType === "Reel" || p.postType === "Video",
      ),
    [posts],
  );

  // Filter by specialty/topic
  const topicFilteredPosts = useMemo(
    () =>
      selectedSpecialty === "All"
        ? videoPosts
        : videoPosts.filter(
            (p) => p.topic.toLowerCase() === selectedSpecialty.toLowerCase(),
          ),
    [videoPosts, selectedSpecialty],
  );

  // The posts that we know are from model accounts (exclude confirmed non-models)
  const displayPosts = useMemo(
    () =>
      topicFilteredPosts.filter((p) => {
        const status = authorModelStatus[p.author.toString()];
        // Show if: confirmed model, OR not yet checked (optimistic display)
        return status !== false;
      }),
    [topicFilteredPosts, authorModelStatus],
  );

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
              onClick={() => setSelectedSpecialty(s)}
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

        {/* Empty state — only show when posts have loaded AND we've checked authors */}
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

        {/* Reel grid */}
        {!isLoading && topicFilteredPosts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topicFilteredPosts.map((post) => (
              <ModelReelCardGated
                key={post.id}
                post={post}
                isMuted={isMuted}
                onToggleMute={() => setIsMuted((m) => !m)}
                myPrincipal={myPrincipal}
                onConfirmModel={handleConfirmModel}
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
