import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  Car,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { PostView } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAuthorClubName,
  useGetProfile,
  useLikePost,
  useUnlikePost,
} from "../hooks/useQueries";
import { hasReactionPack } from "../lib/customizations";
import { awardLikeReceived } from "../lib/revbucks";
import { getInitials, timeAgo, truncatePrincipal } from "../utils/format";
import { ProBadge } from "./ProBadge";

// Safe unwrap for Motoko optional postType ([] | [string] or plain string).
// Always returns lowercase so callers can safely compare with "reel", "video", "photo".
function safePostType(pt: unknown): string {
  if (!pt) return "";
  if (Array.isArray(pt)) return String((pt[0] as string) ?? "").toLowerCase();
  return String(pt).toLowerCase();
}

const REACTION_EMOJIS = ["❤️", "🔥", "🏎️", "⚡", "🤙", "💨"] as const;
type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

interface PostCardProps {
  post: PostView;
  onCommentClick?: (postId: string) => void;
  isVisible?: boolean;
  /** Zero-based position in the feed. Used to set eager loading on the first posts. */
  index?: number;
}

function PostTypeBadge({ type }: { type: unknown }) {
  const lower = safePostType(type);
  if (lower === "photo") return null;
  const colors: Record<string, string> = {
    video: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    reel: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };
  return (
    <span
      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${colors[lower] ?? "badge-orange"}`}
    >
      {lower}
    </span>
  );
}

export function PostCard({
  post,
  onCommentClick,
  isVisible,
  index = 0,
}: PostCardProps) {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const authorKey = post.author.toString();

  const { data: profile, isLoading: profileLoading } = useGetProfile(
    post.author,
  );

  // useAuthorClubName is called at the top level (required by Rules of Hooks)
  // It reads from the live clubs data in React Query, so it works for ANY user —
  // not just the current user like getUserClub(localStorage) does.
  const clubName = useAuthorClubName(authorKey);

  const displayName = profile?.displayName ?? truncatePrincipal(authorKey);
  const avatarUrl = profile?.avatarUrl ?? "";

  const hasLiked = myPrincipal
    ? post.likes.some((l) => l.toString() === myPrincipal)
    : false;
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [likeCount, setLikeCount] = useState(post.likes.length);
  const [selectedReaction, setSelectedReaction] =
    useState<ReactionEmoji | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const reactionButtonRef = useRef<HTMLButtonElement>(null);

  const userHasReactionPack = myPrincipal
    ? hasReactionPack(myPrincipal)
    : false;

  const liked = optimisticLiked !== null ? optimisticLiked : hasLiked;

  const [videoMuted, setVideoMuted] = useState(true);
  const [videoPaused, setVideoPaused] = useState(false);
  const [showPlayPauseHint, setShowPlayPauseHint] = useState<
    "play" | "pause" | null
  >(null);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [imgError, setImgError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ensure video starts muted on mount (React's muted prop is unreliable on initial render)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
    }
  }, []);

  // For the first 2 posts, treat them as always visible so videos load immediately
  // without waiting for IntersectionObserver to fire (which requires scrolling).
  const effectivelyVisible = isVisible || index < 2;

  // Load / unload video source based on visibility to save bandwidth
  useEffect(() => {
    const mediaUrl = post.mediaUrls[0];
    if (!isVideoPost || !mediaUrl) return;

    if (effectivelyVisible) {
      setVideoSrc(mediaUrl);
      setVideoError(false);
      // Slight delay so the src is set before play() is called
      const t = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }, 80);
      return () => clearTimeout(t);
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setVideoSrc("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivelyVisible, post.mediaUrls]);

  // Close reaction picker when clicking outside
  useEffect(() => {
    if (!showReactionPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(e.target as Node) &&
        !reactionButtonRef.current?.contains(e.target as Node)
      ) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showReactionPicker]);

  // Directly set the DOM property since React's muted prop isn't always reliable
  const handleVideoMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVideoMuted((m) => {
      const next = !m;
      if (videoRef.current) {
        videoRef.current.muted = next;
      }
      return next;
    });
  };

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setVideoPaused(false);
      setShowPlayPauseHint("play");
    } else {
      video.pause();
      setVideoPaused(true);
      setShowPlayPauseHint("pause");
    }
    // Clear any previous timeout and fade out the hint after 600ms
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => setShowPlayPauseHint(null), 600);
  };

  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();

  const handleLikeButtonClick = () => {
    if (!myPrincipal) {
      toast.error("Please sign in to like posts");
      return;
    }
    // If user has reaction pack and hasn't liked yet, show picker
    if (userHasReactionPack && !liked) {
      setShowReactionPicker((prev) => !prev);
      return;
    }
    // Otherwise do regular like/unlike
    handleLikeWithReaction(null);
  };

  const handleLikeWithReaction = (reaction: ReactionEmoji | null) => {
    if (!myPrincipal) return;
    setShowReactionPicker(false);
    if (reaction) setSelectedReaction(reaction);

    if (liked) {
      setOptimisticLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      setSelectedReaction(null);
      unlikeMutation.mutate(post.id, {
        onError: () => {
          setOptimisticLiked(null);
          setLikeCount(post.likes.length);
        },
      });
    } else {
      setOptimisticLiked(true);
      const newCount = likeCount + 1;
      setLikeCount(newCount);
      // Award author RevBucks every 10 likes
      if (newCount > 0 && newCount % 10 === 0) {
        const authorPrincipal = post.author.toString();
        awardLikeReceived(authorPrincipal);
      }
      likeMutation.mutate(post.id, {
        onError: () => {
          setOptimisticLiked(null);
          setLikeCount(post.likes.length);
          setSelectedReaction(null);
        },
      });
    }
  };

  const handleLike = handleLikeButtonClick;

  const isVideoPost =
    safePostType(post.postType) === "video" ||
    safePostType(post.postType) === "reel";

  const handleShare = async () => {
    const shareUrl = `https://revspace-2ah.caffeine.xyz/#post-${post.id}`;
    const shareText = post.content
      ? post.content.length > 100
        ? `${post.content.slice(0, 100)}…`
        : post.content
      : "Check this out on RevSpace";

    const isPhoto = safePostType(post.postType) === "photo";
    const imageUrl = post.mediaUrls[0];

    if (navigator.share) {
      try {
        // Try to attach the image file for photos (not videos — too large / often rejected)
        if (isPhoto && imageUrl) {
          try {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            const ext = blob.type.includes("png") ? "png" : "jpg";
            const file = new File([blob], `revspace-post.${ext}`, {
              type: blob.type,
            });
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({
                title: "Check this out on RevSpace",
                text: shareText,
                url: shareUrl,
                files: [file],
              });
              return;
            }
          } catch {
            // Image fetch/attach failed — fall through to URL-only share
          }
        }

        // URL-only share (videos, or when image attach fails)
        await navigator.share({
          title: "Check this out on RevSpace",
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        toast.error("Sharing failed");
      }
    } else {
      // Desktop fallback — copy link to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied!");
      } catch {
        toast.error("Sharing failed");
      }
    }
  };

  return (
    <article className="post-card animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          to="/profile/$userId"
          params={{ userId: authorKey }}
          className="flex items-center gap-3 group"
        >
          <Avatar className="w-9 h-9">
            {profileLoading ? (
              <AvatarFallback
                style={{ background: "oklch(var(--surface-elevated))" }}
              >
                <Skeleton className="w-full h-full rounded-full" />
              </AvatarFallback>
            ) : (
              <>
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={displayName} />
                ) : null}
                <AvatarFallback
                  style={{ background: "oklch(var(--surface-elevated))" }}
                >
                  {getInitials(displayName)}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {profileLoading ? (
                <Skeleton className="w-24 h-3" />
              ) : (
                <>
                  <span className="text-sm font-semibold text-foreground group-hover:underline underline-offset-2">
                    {displayName}
                  </span>
                  {clubName ? (
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
                      <span
                        style={{ WebkitTextFillColor: "oklch(0.7 0.18 45)" }}
                      >
                        ⚡
                      </span>
                      {clubName}
                    </span>
                  ) : null}
                </>
              )}
              {!profileLoading && authorKey === myPrincipal && <ProBadge />}
              <PostTypeBadge type={post.postType} />
            </div>
            <span className="text-xs text-steel">
              {timeAgo(post.timestamp)}
            </span>
          </div>
        </Link>
        <button
          type="button"
          className="text-steel hover:text-foreground transition-colors p-1"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Media */}
      {post.mediaUrls.length > 0 && (
        <div className="relative">
          {isVideoPost ? (
            videoError ? (
              <div
                className="feed-image aspect-[4/3] flex flex-col items-center justify-center gap-2"
                style={{ background: "oklch(var(--surface))" }}
              >
                <Car size={32} className="opacity-40 text-steel" />
                <span className="text-xs opacity-60 text-steel">
                  Video unavailable
                </span>
              </div>
            ) : (
              // biome-ignore lint/a11y/useKeyWithClickEvents: video tap-to-play is standard UX
              <video
                key={post.id}
                ref={videoRef}
                src={videoSrc || undefined}
                muted
                loop
                playsInline
                preload="none"
                onClick={handleVideoClick}
                className="feed-image aspect-[4/3] w-full object-cover cursor-pointer"
                onError={() => {
                  setVideoError(true);
                  setVideoPaused(true);
                }}
              >
                <track kind="captions" />
              </video>
            )
          ) : imgError ? (
            <div
              className="feed-image aspect-[4/3] flex flex-col items-center justify-center gap-2"
              style={{ background: "oklch(var(--surface))" }}
            >
              <Car size={32} className="opacity-40 text-steel" />
              <span className="text-xs opacity-60 text-steel">
                Media unavailable
              </span>
            </div>
          ) : (
            <img
              src={post.mediaUrls[0]}
              alt="Post media"
              className="feed-image aspect-[4/3]"
              loading={index < 3 ? "eager" : "lazy"}
              decoding="async"
              onError={() => setImgError(true)}
            />
          )}
          {isVideoPost && (
            <>
              {/* Play/pause tap feedback — fades out automatically */}
              {showPlayPauseHint && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ animation: "fadeOutHint 0.6s ease-out forwards" }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "oklch(0 0 0 / 0.5)" }}
                  >
                    {showPlayPauseHint === "pause" ? (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="white"
                        role="img"
                        aria-label="Paused"
                      >
                        <title>Paused</title>
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="white"
                        role="img"
                        aria-label="Playing"
                      >
                        <title>Playing</title>
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
              {/* Paused state — persistent play icon so user knows it's paused */}
              {videoPaused && !showPlayPauseHint && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ background: "oklch(0 0 0 / 0.25)" }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "oklch(0 0 0 / 0.5)" }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="white"
                      role="img"
                      aria-label="Play"
                    >
                      <title>Play</title>
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </div>
                </div>
              )}
              {/* Mute toggle button */}
              <button
                type="button"
                aria-label={videoMuted ? "Unmute video" : "Mute video"}
                onClick={handleVideoMuteToggle}
                className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "oklch(0 0 0 / 0.55)" }}
              >
                {videoMuted ? (
                  <VolumeX size={18} color="white" />
                ) : (
                  <Volume2 size={18} color="white" />
                )}
              </button>
            </>
          )}
        </div>
      )}

      {/* Content */}
      {post.content && (
        <div className="px-4 py-3">
          <p className="text-sm text-foreground leading-relaxed">
            {post.content}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex items-center gap-4">
          {/* Like / Reaction button */}
          <div className="relative">
            <button
              ref={reactionButtonRef}
              type="button"
              onClick={handleLike}
              className={`action-btn ${liked ? "liked" : ""}`}
            >
              {liked && selectedReaction ? (
                <span className="text-lg leading-none">{selectedReaction}</span>
              ) : (
                <Heart
                  size={20}
                  fill={liked ? "currentColor" : "none"}
                  className="transition-transform active:scale-110"
                />
              )}
              <span>{likeCount > 0 ? likeCount : ""}</span>
            </button>

            {/* Reaction picker */}
            <AnimatePresence>
              {showReactionPicker && (
                <motion.div
                  ref={reactionPickerRef}
                  initial={{ opacity: 0, scale: 0.85, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: 8 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute bottom-full left-0 mb-2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-2xl shadow-xl"
                  style={{
                    background: "oklch(0.18 0.02 240)",
                    border: "1px solid oklch(0.3 0.02 240)",
                    boxShadow:
                      "0 8px 32px oklch(0 0 0 / 0.6), 0 0 0 1px oklch(0.35 0.02 240)",
                  }}
                >
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={`React with ${emoji}`}
                      onClick={() => handleLikeWithReaction(emoji)}
                      className="text-xl w-9 h-9 flex items-center justify-center rounded-xl transition-transform hover:scale-125 active:scale-110"
                      style={{
                        background: "transparent",
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            type="button"
            className="action-btn"
            onClick={() => onCommentClick?.(post.id)}
          >
            <MessageCircle size={20} />
            <span>{post.comments.length > 0 ? post.comments.length : ""}</span>
          </button>
          <button
            type="button"
            className="action-btn"
            onClick={handleShare}
            data-ocid="post.share_button"
          >
            <Share2 size={20} />
          </button>
        </div>
        <button type="button" className="action-btn">
          <Bookmark size={20} />
        </button>
      </div>
    </article>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="post-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="w-28 h-3" />
          <Skeleton className="w-16 h-2" />
        </div>
      </div>
      <Skeleton className="w-full aspect-[4/3]" />
      <div className="px-4 py-3 space-y-2">
        <Skeleton className="w-full h-3" />
        <Skeleton className="w-3/4 h-3" />
      </div>
      <div className="flex gap-4 px-4 pb-3">
        <Skeleton className="w-12 h-5" />
        <Skeleton className="w-12 h-5" />
        <Skeleton className="w-8 h-5" />
      </div>
    </div>
  );
}
