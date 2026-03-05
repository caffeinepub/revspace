import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Principal } from "@icp-sdk/core/principal";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  ChevronLeft,
  Film,
  Heart,
  Loader2,
  MessageCircle,
  Share2,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ProBadge } from "../components/ProBadge";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { usePublicActor } from "../hooks/usePublicActor";
import {
  useAddComment,
  useAuthorClubName,
  useDeletePost,
  useGetAllPosts,
  useGetComments,
  useGetProfile,
  useLikePost,
  useUnlikePost,
} from "../hooks/useQueries";
import { timeAgo, truncatePrincipal } from "../utils/format";

// Safe unwrap for Motoko optional postType ([] | [string] or plain string).
// Always returns lowercase for consistent comparison.
function safePostType(pt: unknown): string {
  if (!pt) return "";
  if (Array.isArray(pt)) return String((pt[0] as string) ?? "").toLowerCase();
  return String(pt).toLowerCase();
}

// ─── CommentAuthorRow ─────────────────────────────────────────────────────────
function CommentAuthorRow({ author }: { author: Principal }) {
  const { data: profile } = useGetProfile(author);
  const displayName =
    profile?.displayName ?? truncatePrincipal(author.toString());
  const avatarUrl = profile?.avatarUrl ?? "";
  const authorKey = author.toString();

  return (
    <div className="flex gap-2 items-start">
      <Avatar className="w-7 h-7 shrink-0 border border-white/20">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
        <AvatarFallback className="text-[10px] bg-white/10 text-white">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <Link
          to="/profile/$userId"
          params={{ userId: authorKey }}
          className="text-xs font-semibold text-white/90 hover:underline underline-offset-2"
        >
          {displayName}
        </Link>
      </div>
    </div>
  );
}

// ─── ReelsCommentsPanel ───────────────────────────────────────────────────────
interface ReelsCommentsPanelProps {
  postId: string;
  onClose: () => void;
}

function ReelsCommentsPanel({ postId, onClose }: ReelsCommentsPanelProps) {
  const [text, setText] = useState("");
  const addComment = useAddComment();
  const { data: comments, isLoading } = useGetComments(postId);

  const handleSubmit = () => {
    if (!text.trim()) return;
    addComment.mutate(
      { postId, content: text.trim() },
      {
        onSuccess: () => {
          setText("");
          toast.success("Comment added");
        },
        onError: () => toast.error("Failed to add comment"),
      },
    );
  };

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close comments"
        className="fixed inset-0 z-40"
        style={{ background: "oklch(0 0 0 / 0.6)" }}
        onClick={onClose}
      />

      {/* Slide-up panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl overflow-hidden"
        style={{
          background: "oklch(0.14 0.01 260)",
          border: "1px solid oklch(1 0 0 / 0.12)",
          borderBottom: "none",
          maxHeight: "70vh",
          animation: "slideUpPanel 0.28s cubic-bezier(0.32, 0.72, 0, 1) both",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 0.1)" }}
        >
          <span className="text-white font-semibold text-base">Comments</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "oklch(1 0 0 / 0.08)" }}
          >
            <X size={16} color="white" />
          </button>
        </div>

        {/* Comments list */}
        <div
          className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
          style={{ overscrollBehavior: "contain" }}
        >
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2
                size={22}
                className="animate-spin"
                style={{ color: "oklch(var(--orange))" }}
              />
            </div>
          ) : comments && comments.length > 0 ? (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <CommentAuthorRow author={c.author} />
                <div className="flex-1 min-w-0 -mt-0.5">
                  <span className="text-[10px] text-white/40">
                    {timeAgo(c.timestamp)}
                  </span>
                  <p className="text-sm text-white/85 mt-0.5 break-words">
                    {c.content}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-6 text-white/40 text-sm">
              No comments yet. Be the first!
            </p>
          )}
        </div>

        {/* Input area */}
        <div
          className="flex gap-2 px-3 py-3 shrink-0"
          style={{ borderTop: "1px solid oklch(1 0 0 / 0.1)" }}
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[44px] max-h-[100px] resize-none text-sm text-white placeholder:text-white/30"
            style={{
              background: "oklch(1 0 0 / 0.07)",
              border: "1px solid oklch(1 0 0 / 0.15)",
              color: "white",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || addComment.isPending}
            className="self-end shrink-0"
            style={{
              background: "oklch(var(--orange))",
              color: "oklch(var(--carbon))",
            }}
          >
            {addComment.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              "Post"
            )}
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes slideUpPanel {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ─── ReelAuthorInfo ──────────────────────────────────────────────────────────
interface ReelAuthorInfoProps {
  authorPrincipal: Principal;
  myPrincipal?: string;
}

function ReelAuthorInfo({ authorPrincipal, myPrincipal }: ReelAuthorInfoProps) {
  const { data: profile, isLoading } = useGetProfile(authorPrincipal);
  const authorKey = authorPrincipal.toString();
  const clubName = useAuthorClubName(authorKey);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 mb-3">
        <Skeleton
          className="w-9 h-9 rounded-full"
          style={{ background: "oklch(0 0 0 / 0.4)" }}
        />
        <div className="flex flex-col gap-1">
          <Skeleton
            className="w-24 h-3"
            style={{ background: "oklch(1 0 0 / 0.2)" }}
          />
          <Skeleton
            className="w-14 h-2"
            style={{ background: "oklch(1 0 0 / 0.15)" }}
          />
        </div>
      </div>
    );
  }

  const displayName = profile?.displayName ?? truncatePrincipal(authorKey);
  const avatarUrl = profile?.avatarUrl ?? "";

  return (
    <Link
      to="/profile/$userId"
      params={{ userId: authorKey }}
      className="flex items-center gap-2 mb-3 group"
    >
      <Avatar className="w-9 h-9 border-2 border-white">
        {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
        <AvatarFallback className="text-xs">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-0.5">
        <p className="text-white text-sm font-semibold flex items-center gap-1.5 group-hover:underline underline-offset-2">
          {displayName}
          {authorKey === myPrincipal && <ProBadge />}
        </p>
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

// ─── ReelMedia ────────────────────────────────────────────────────────────────
interface ReelMediaProps {
  mediaUrl: string | undefined;
  postId: string;
  postType: string;
  isMuted?: boolean;
  isVisible?: boolean; // only play when this reel is in the viewport
  videoRef?: (el: HTMLVideoElement | null) => void;
  onTimeUpdate?: (postId: string, progress: number) => void;
}

function ReelMedia({
  mediaUrl,
  postId,
  postType,
  isMuted = true,
  isVisible = false,
  videoRef,
  onTimeUpdate,
}: ReelMediaProps) {
  const [videoError, setVideoError] = useState(false);

  if (!mediaUrl) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: "#111" }}
      >
        <Film size={48} className="text-white/30" />
      </div>
    );
  }

  // safePostType already returns lowercase — no need for additional .toLowerCase()
  const normalizedType = safePostType(postType);
  const isVideoType = normalizedType === "reel" || normalizedType === "video";

  if (isVideoType) {
    if (videoError) {
      return (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: "#111" }}
        >
          <Film size={40} className="text-white/20" />
          <p className="text-white/40 text-sm font-medium">Video unavailable</p>
        </div>
      );
    }

    return (
      <video
        key={mediaUrl}
        ref={(el) => {
          if (el) {
            el.muted = isMuted;
            // Only preload metadata for off-screen reels; preload full data for
            // the visible one so it plays instantly without buffering freeze.
            el.preload = isVisible ? "auto" : "none";
          }
          if (typeof videoRef === "function") videoRef(el);
        }}
        src={mediaUrl}
        // Do NOT use autoPlay — visibility is controlled via play()/pause() in
        // the parent's IntersectionObserver so only one video loads at a time.
        muted={isMuted}
        loop
        playsInline
        // preload is set via the ref above based on visibility
        className="absolute inset-0 w-full h-full object-cover"
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          if (video.duration > 0) {
            const pct = (video.currentTime / video.duration) * 100;
            onTimeUpdate?.(postId, pct);
          }
        }}
        onError={() => setVideoError(true)}
      >
        <track kind="captions" />
      </video>
    );
  }

  return (
    <img
      src={mediaUrl}
      alt=""
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

const REEL_TOPICS = [
  "All",
  "Street Drift",
  "Car Show",
  "Track Day",
  "Burnout",
  "Stance",
  "JDM Build",
  "Muscle",
  "Import",
  "Cars & Coffee",
  "Other",
];

// ─── ReelsPage ────────────────────────────────────────────────────────────────
export function ReelsPage() {
  const { data: posts, isLoading } = useGetAllPosts();
  // We call usePublicActor and useActor so their side-effects run (invalidation
  // after login), but we no longer block reel rendering on the actor state.
  // The queryFn in useGetAllPosts awaits getPublicActor() internally, so posts
  // will arrive as soon as the actor singleton resolves — no need for a separate
  // actorLoading gate here.
  usePublicActor();
  useActor();
  // Only show the loading screen if posts haven't arrived yet AND the query is
  // still in-flight. Once we have any posts (even cached ones) we skip straight
  // to rendering them.
  const postsArray = posts as { id: string }[] | undefined;
  const actorLoading = isLoading && (!postsArray || postsArray.length === 0);
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  // Start muted so autoplay works on mobile (browsers block autoplay with sound).
  // Users can unmute by tapping the sound button.
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [selectedTopic, setSelectedTopic] = useState("All");
  // Track which single reel is currently visible in the viewport
  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  // Map postId → reel container DOM element for IntersectionObserver
  const reelContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();
  const deletePostMutation = useDeletePost();

  // Only show Reel and Video posts — not Photos — on the Reels page.
  // safePostType always returns lowercase so comparisons are safe.
  const allPosts = (posts ?? []).filter((p) => {
    const t = safePostType(p.postType);
    return t === "reel" || t === "video";
  });
  const displayPosts =
    selectedTopic === "All"
      ? allPosts
      : allPosts.filter((p) => p.topic === selectedTopic);

  // ── IntersectionObserver: play only the visible reel, pause all others ──────
  // This is the primary fix for reels freezing. Without it every mounted video
  // tries to decode and play simultaneously, starving bandwidth and locking the
  // main thread. With it only one video is active at a time.
  const registerReelContainer = useCallback(
    (postId: string, el: HTMLDivElement | null) => {
      if (el) {
        reelContainerRefs.current.set(postId, el);
      } else {
        reelContainerRefs.current.delete(postId);
      }
    },
    [],
  );

  useEffect(() => {
    // Tear down any previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const postId = (entry.target as HTMLElement).dataset.postId;
          if (!postId) continue;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setVisiblePostId(postId);
          }
        }
      },
      {
        // Fire when 60% of the reel card is visible — avoids flickering at edges
        threshold: 0.6,
      },
    );

    for (const [_postId, el] of reelContainerRefs.current.entries()) {
      observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
    };
    // Empty deps — the observer reads from refs (reelContainerRefs) which are
    // mutated directly and don't need to be in the dependency array. The observer
    // callback only calls setVisiblePostId so it is always current via closure.
  }, []);

  // ── Play/pause based on visibility ──────────────────────────────────────────
  useEffect(() => {
    for (const [postId, video] of videoRefs.current.entries()) {
      video.muted = isMuted;
      if (postId === visiblePostId) {
        // Ensure preload is set to auto for the visible video so it buffers
        video.preload = "auto";
        video.play().catch(() => {
          // Autoplay blocked (uncommon since muted) — silently ignore
        });
      } else {
        video.pause();
        // Release memory for off-screen videos: remove preload hint
        video.preload = "none";
      }
    }
  }, [visiblePostId, isMuted]);

  // Sync muted state directly on video DOM elements (React prop alone isn't always reliable)
  useEffect(() => {
    for (const video of videoRefs.current.values()) {
      video.muted = isMuted;
    }
  }, [isMuted]);

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
      setTimeout(
        () => setConfirmDeleteId((cur) => (cur === postId ? null : cur)),
        3000,
      );
    }
  };

  const handleShare = async (post: (typeof displayPosts)[number]) => {
    const shareUrl = `https://revspace-2ah.caffeine.xyz/#post-${post.id}`;
    const shareText = post.content
      ? post.content.length > 100
        ? `${post.content.slice(0, 100)}…`
        : post.content
      : "Check this out on RevSpace";

    // Reels/videos: skip file attachment (too large and often rejected by Web Share API)
    // Photos: attempt to attach the image so share sheets show a preview
    const isPhoto = safePostType(post.postType).toLowerCase() === "photo";
    const imageUrl = post.mediaUrls[0];

    if (navigator.share) {
      try {
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
            // Image attach failed — fall through to URL-only share
          }
        }

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
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied!");
      } catch {
        toast.error("Sharing failed");
      }
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

      {/* Topic filter bar — sticky at top */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex gap-2 px-4 pt-3 pb-2 overflow-x-auto scrollbar-hide"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0 0 0 / 0.85) 0%, transparent 100%)",
          paddingLeft: "3.5rem",
        }}
      >
        {REEL_TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSelectedTopic(t)}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={
              selectedTopic === t
                ? {
                    background: "oklch(var(--orange))",
                    color: "oklch(var(--carbon))",
                    boxShadow: "0 0 12px oklch(var(--orange) / 0.5)",
                  }
                : {
                    background: "oklch(0 0 0 / 0.5)",
                    color: "oklch(1 0 0 / 0.75)",
                    border: "1px solid oklch(1 0 0 / 0.2)",
                    backdropFilter: "blur(8px)",
                  }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {commentPostId && (
        <ReelsCommentsPanel
          postId={commentPostId}
          onClose={() => setCommentPostId(null)}
        />
      )}

      {(isLoading || actorLoading) && (
        <div className="h-screen flex flex-col items-center justify-center text-center px-6">
          <Loader2
            size={36}
            className="animate-spin mb-4"
            style={{ color: "oklch(var(--orange))" }}
          />
          <p className="text-white/50 text-sm">Loading reels...</p>
        </div>
      )}

      {!isLoading && !actorLoading && displayPosts.length === 0 && (
        <div className="h-screen flex flex-col items-center justify-center text-center px-6">
          <Film size={48} className="text-white/30 mb-4" />
          <h3 className="text-white font-display text-xl font-bold mb-2">
            {selectedTopic === "All"
              ? "No Reels Yet"
              : `No "${selectedTopic}" Reels`}
          </h3>
          <p className="text-white/50 text-sm mb-6">
            {selectedTopic === "All"
              ? "Upload your first video reel to get started."
              : "Be the first to upload a reel with this topic."}
          </p>
          <Link to="/create">
            <Button
              style={{
                background: "oklch(var(--orange))",
                color: "oklch(var(--carbon))",
              }}
            >
              Upload Reel
            </Button>
          </Link>
        </div>
      )}

      {displayPosts.map((post) => {
        const serverLiked = myPrincipal
          ? post.likes.some((l) => l.toString() === myPrincipal)
          : false;
        const liked = likedPosts.has(post.id) || serverLiked;
        const postProgress = progress[post.id] ?? 0;

        const isVisible = visiblePostId === post.id;

        return (
          <div
            key={post.id}
            className="reel-card shrink-0"
            data-post-id={post.id}
            ref={(el) => registerReelContainer(post.id, el)}
          >
            {/* Background media */}
            <div className="absolute inset-0">
              <ReelMedia
                mediaUrl={post.mediaUrls[0]}
                postId={post.id}
                postType={post.postType}
                isMuted={isMuted}
                isVisible={isVisible}
                videoRef={(el) => {
                  if (el) {
                    el.muted = isMuted;
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
              <ReelAuthorInfo
                authorPrincipal={post.author}
                myPrincipal={myPrincipal}
              />
              {post.topic && (
                <span
                  className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-2"
                  style={{
                    background: "oklch(var(--orange) / 0.25)",
                    color: "oklch(var(--orange-bright))",
                    border: "1px solid oklch(var(--orange) / 0.5)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  # {post.topic}
                </span>
              )}
              <p className="text-white text-sm leading-relaxed line-clamp-3">
                {post.content}
              </p>
              <p className="text-white/50 text-xs mt-1">
                {timeAgo(post.timestamp)}
              </p>
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
                  {isMuted ? (
                    <VolumeX size={22} color="white" />
                  ) : (
                    <Volume2 size={22} color="white" />
                  )}
                </div>
                <span className="text-white text-xs">
                  {isMuted ? "Muted" : "Sound"}
                </span>
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
                onClick={() => setCommentPostId(post.id)}
                className="flex flex-col items-center gap-1"
                aria-label="Open comments"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0 0 0 / 0.4)" }}
                >
                  <MessageCircle size={22} color="white" />
                </div>
                <span className="text-white text-xs">
                  {post.comments.length}
                </span>
              </button>

              <button
                type="button"
                className="flex flex-col items-center gap-1"
                onClick={() => handleShare(post)}
                data-ocid="reel.share_button"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0 0 0 / 0.4)" }}
                >
                  <Share2 size={22} color="white" />
                </div>
                <span className="text-white text-xs">Share</span>
              </button>

              <button
                type="button"
                className="flex flex-col items-center gap-1"
              >
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
                      background:
                        confirmDeleteId === post.id
                          ? "oklch(0.5 0.2 30 / 0.8)"
                          : "oklch(0 0 0 / 0.4)",
                    }}
                  >
                    <Trash2
                      size={20}
                      color={
                        confirmDeleteId === post.id
                          ? "white"
                          : "oklch(0.7 0.15 30)"
                      }
                    />
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
