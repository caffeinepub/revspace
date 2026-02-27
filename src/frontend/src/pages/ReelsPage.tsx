import { useState, useRef } from "react";
import { Heart, MessageCircle, Share2, Bookmark, ChevronLeft, Film, Trash2, Volume2, VolumeX } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAllPosts, useLikePost, useUnlikePost, useGetProfile, useDeletePost } from "../hooks/useQueries";
import { DEMO_POSTS } from "../data/demo";
import { timeAgo, truncatePrincipal } from "../utils/format";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { toast } from "sonner";
import type { Principal } from "@icp-sdk/core/principal";

// ─── ReelAuthorInfo ──────────────────────────────────────────────────────────
interface ReelAuthorInfoProps {
  authorPrincipal: Principal;
}

function ReelAuthorInfo({ authorPrincipal }: ReelAuthorInfoProps) {
  const { data: profile, isLoading } = useGetProfile(authorPrincipal);
  const authorKey = authorPrincipal.toString();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="w-9 h-9 rounded-full" style={{ background: "oklch(0 0 0 / 0.4)" }} />
        <div className="flex flex-col gap-1">
          <Skeleton className="w-24 h-3" style={{ background: "oklch(1 0 0 / 0.2)" }} />
          <Skeleton className="w-14 h-2" style={{ background: "oklch(1 0 0 / 0.15)" }} />
        </div>
      </div>
    );
  }

  const displayName = profile?.displayName ?? truncatePrincipal(authorKey);
  const avatarUrl = profile?.avatarUrl ?? "";

  return (
    <Link to="/profile/$userId" params={{ userId: authorKey }} className="flex items-center gap-2 mb-3 group">
      <Avatar className="w-9 h-9 border-2 border-white">
        {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
        <AvatarFallback className="text-xs">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <p className="text-white text-sm font-semibold group-hover:underline underline-offset-2">{displayName}</p>
    </Link>
  );
}

// ─── ReelMedia ────────────────────────────────────────────────────────────────
interface ReelMediaProps {
  mediaUrl: string | undefined;
  postId: string;
  postType: string;
  isMuted: boolean;
  videoRef?: (el: HTMLVideoElement | null) => void;
  onTimeUpdate?: (postId: string, progress: number) => void;
}

function ReelMedia({ mediaUrl, postId, postType, isMuted, videoRef, onTimeUpdate }: ReelMediaProps) {
  if (!mediaUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#111" }}>
        <Film size={48} className="text-white/30" />
      </div>
    );
  }

  const isVideoType = postType === "Reel" || postType === "Video";

  if (isVideoType) {
    return (
      <video
        key={mediaUrl}
        ref={videoRef}
        src={mediaUrl}
        autoPlay
        muted={isMuted}
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          if (video.duration > 0) {
            const pct = (video.currentTime / video.duration) * 100;
            onTimeUpdate?.(postId, pct);
          }
        }}
      >
        <track kind="captions" />
      </video>
    );
  }

  return (
    <img
      src={mediaUrl ?? `https://picsum.photos/seed/${postId}/600/900`}
      alt=""
      className="w-full h-full object-cover"
    />
  );
}

// ─── ReelsPage ────────────────────────────────────────────────────────────────
export function ReelsPage() {
  const { data: posts } = useGetAllPosts();
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();
  const deletePostMutation = useDeletePost();

  const displayPosts = posts && posts.length > 0 ? posts : DEMO_POSTS;

  const handleTimeUpdate = (postId: string, pct: number) => {
    setProgress((prev) => ({ ...prev, [postId]: pct }));
  };

  const handleLike = (postId: string, currentlyLiked: boolean) => {
    if (!myPrincipal) {
      toast.error("Sign in to like posts");
      return;
    }
    if (currentlyLiked) {
      setLikedPosts((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      unlikeMutation.mutate(postId);
    } else {
      setLikedPosts((prev) => new Set([...prev, postId]));
      likeMutation.mutate(postId);
    }
  };

  const handleDelete = (postId: string) => {
    if (confirmDeleteId === postId) {
      deletePostMutation.mutate(postId, {
        onSuccess: () => {
          toast.success("Reel deleted");
          setConfirmDeleteId(null);
        },
        onError: () => {
          toast.error("Failed to delete reel");
          setConfirmDeleteId(null);
        },
      });
    } else {
      setConfirmDeleteId(postId);
      setTimeout(() => setConfirmDeleteId((cur) => (cur === postId ? null : cur)), 3000);
    }
  };

  return (
    <div
      className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      style={{ background: "#000" }}
    >
      {/* Back button */}
      <Link to="/" className="fixed top-4 left-4 z-50 lg:hidden">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "oklch(0 0 0 / 0.5)" }}
        >
          <ChevronLeft size={20} className="text-white" />
        </div>
      </Link>

      {displayPosts.map((post) => {
        const serverLiked = myPrincipal ? post.likes.some((l) => l.toString() === myPrincipal) : false;
        const liked = likedPosts.has(post.id) || serverLiked;
        const postProgress = progress[post.id] ?? 0;

        return (
          <div
            key={post.id}
            className="reel-card shrink-0"
          >
            {/* Background media */}
            <div className="absolute inset-0">
              <ReelMedia
                mediaUrl={post.mediaUrls[0]}
                postId={post.id}
                postType={post.postType}
                isMuted={isMuted}
                videoRef={(el) => {
                  if (el) {
                    videoRefs.current.set(post.id, el);
                  } else {
                    videoRefs.current.delete(post.id);
                  }
                }}
                onTimeUpdate={handleTimeUpdate}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, oklch(0 0 0 / 0.8) 0%, transparent 40%, oklch(0 0 0 / 0.2) 100%)",
                }}
              />
            </div>

            {/* Content overlay */}
            <div className="absolute bottom-24 left-0 right-16 px-4">
              <ReelAuthorInfo authorPrincipal={post.author} />
              <p className="text-white text-sm leading-relaxed line-clamp-3">{post.content}</p>
              <p className="text-white/50 text-xs mt-1">{timeAgo(post.timestamp)}</p>
            </div>

            {/* Right actions */}
            <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
              {/* Sound toggle */}
              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                className="flex flex-col items-center gap-1"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0 0 0 / 0.4)" }}
                >
                  {isMuted
                    ? <VolumeX size={22} color="white" />
                    : <Volume2 size={22} color="white" />
                  }
                </div>
                <span className="text-white text-xs">{isMuted ? "Sound" : "Muted"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleLike(post.id, liked)}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0 0 0 / 0.4)" }}
                >
                  <Heart
                    size={22}
                    fill={liked ? "oklch(var(--ember))" : "none"}
                    color={liked ? "oklch(var(--ember))" : "white"}
                  />
                </div>
                <span className="text-white text-xs">{post.likes.length}</span>
              </button>

              <button
                type="button"
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0 0 0 / 0.4)" }}
                >
                  <MessageCircle size={22} color="white" />
                </div>
                <span className="text-white text-xs">{post.comments.length}</span>
              </button>

              <button type="button" className="flex flex-col items-center gap-1">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0 0 0 / 0.4)" }}
                >
                  <Share2 size={22} color="white" />
                </div>
                <span className="text-white text-xs">Share</span>
              </button>

              <button type="button" className="flex flex-col items-center gap-1">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0 0 0 / 0.4)" }}
                >
                  <Bookmark size={22} color="white" />
                </div>
                <span className="text-white text-xs">Save</span>
              </button>

              {/* Delete — only for post owner */}
              {myPrincipal && post.author.toString() === myPrincipal && (
                <button
                  type="button"
                  onClick={() => handleDelete(post.id)}
                  disabled={deletePostMutation.isPending}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      background: confirmDeleteId === post.id
                        ? "oklch(0.5 0.2 30 / 0.8)"
                        : "oklch(0 0 0 / 0.4)",
                    }}
                  >
                    <Trash2 size={20} color={confirmDeleteId === post.id ? "white" : "oklch(0.7 0.15 30)"} />
                  </div>
                  <span className="text-white text-xs">
                    {confirmDeleteId === post.id ? "Confirm" : "Delete"}
                  </span>
                </button>
              )}
            </div>

            {/* Playback progress bar */}
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{ height: "3px", background: "oklch(1 0 0 / 0.15)" }}
            >
              <div
                className="h-full transition-all duration-200"
                style={{
                  width: `${postProgress}%`,
                  background: "oklch(var(--orange, 0.7 0.18 40))",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
