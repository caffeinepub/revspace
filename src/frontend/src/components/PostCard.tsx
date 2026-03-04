import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { PostView } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetProfile, useLikePost, useUnlikePost } from "../hooks/useQueries";
import { awardLikeReceived } from "../lib/revbucks";
import { getInitials, timeAgo, truncatePrincipal } from "../utils/format";
import { ProBadge } from "./ProBadge";

interface PostCardProps {
  post: PostView;
  onCommentClick?: (postId: string) => void;
}

function PostTypeBadge({ type }: { type: string }) {
  const lower = type?.toLowerCase() ?? "";
  if (lower === "photo") return null;
  const colors: Record<string, string> = {
    video: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    reel: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };
  return (
    <span
      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${colors[lower] ?? "badge-orange"}`}
    >
      {type}
    </span>
  );
}

export function PostCard({ post, onCommentClick }: PostCardProps) {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const authorKey = post.author.toString();

  const { data: profile, isLoading: profileLoading } = useGetProfile(
    post.author,
  );
  const displayName = profile?.displayName ?? truncatePrincipal(authorKey);
  const avatarUrl = profile?.avatarUrl ?? "";

  const hasLiked = myPrincipal
    ? post.likes.some((l) => l.toString() === myPrincipal)
    : false;
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [likeCount, setLikeCount] = useState(post.likes.length);

  const liked = optimisticLiked !== null ? optimisticLiked : hasLiked;

  const [videoMuted, setVideoMuted] = useState(true);
  const [videoPaused, setVideoPaused] = useState(false);
  const [showPlayPauseHint, setShowPlayPauseHint] = useState<
    "play" | "pause" | null
  >(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ensure video starts muted on mount (React's muted prop is unreliable on initial render)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
    }
  }, []);

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

  const handleLike = () => {
    if (!myPrincipal) {
      toast.error("Please sign in to like posts");
      return;
    }
    if (liked) {
      setOptimisticLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
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
        },
      });
    }
  };

  const isVideoPost =
    post.postType?.toLowerCase() === "video" ||
    post.postType?.toLowerCase() === "reel";

  const handleShare = async () => {
    const shareUrl = `https://revspace-2ah.caffeine.xyz/#post-${post.id}`;
    const shareText = post.content
      ? post.content.length > 100
        ? `${post.content.slice(0, 100)}…`
        : post.content
      : "Check this out on RevSpace";

    const isPhoto = post.postType?.toLowerCase() === "photo";
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
            <div className="flex items-center gap-2">
              {profileLoading ? (
                <Skeleton className="w-24 h-3" />
              ) : (
                <span className="text-sm font-semibold text-foreground group-hover:underline underline-offset-2">
                  {displayName}
                </span>
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
            // biome-ignore lint/a11y/useKeyWithClickEvents: video tap-to-play is standard UX
            <video
              key={post.mediaUrls[0]}
              ref={videoRef}
              src={post.mediaUrls[0]}
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              onClick={handleVideoClick}
              className="feed-image aspect-[4/3] w-full object-cover cursor-pointer"
              onError={() => setVideoPaused(true)}
            >
              <track kind="captions" />
            </video>
          ) : (
            <img
              src={post.mediaUrls[0]}
              alt="Post media"
              className="feed-image aspect-[4/3]"
              loading="lazy"
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
          <button
            type="button"
            onClick={handleLike}
            className={`action-btn ${liked ? "liked" : ""}`}
          >
            <Heart
              size={20}
              fill={liked ? "currentColor" : "none"}
              className="transition-transform active:scale-110"
            />
            <span>{likeCount > 0 ? likeCount : ""}</span>
          </button>
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
