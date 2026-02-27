import { useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostView } from "../backend.d";
import { timeAgo, getInitials, truncatePrincipal } from "../utils/format";
import { useLikePost, useUnlikePost, useGetProfile } from "../hooks/useQueries";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { toast } from "sonner";

interface PostCardProps {
  post: PostView;
  onCommentClick?: (postId: string) => void;
}

function PostTypeBadge({ type }: { type: string }) {
  if (type === "Photo") return null;
  const colors: Record<string, string> = {
    Video: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Reel: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${colors[type] ?? "badge-orange"}`}>
      {type}
    </span>
  );
}

export function PostCard({ post, onCommentClick }: PostCardProps) {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const authorKey = post.author.toString();

  const { data: profile, isLoading: profileLoading } = useGetProfile(post.author);
  const displayName = profile?.displayName ?? truncatePrincipal(authorKey);
  const avatarUrl = profile?.avatarUrl ?? "";

  const hasLiked = myPrincipal ? post.likes.some((l) => l.toString() === myPrincipal) : false;
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [likeCount, setLikeCount] = useState(post.likes.length);

  const liked = optimisticLiked !== null ? optimisticLiked : hasLiked;

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
      setLikeCount((c) => c + 1);
      likeMutation.mutate(post.id, {
        onError: () => {
          setOptimisticLiked(null);
          setLikeCount(post.likes.length);
        },
      });
    }
  };

  const isVideoPost = post.postType === "Video" || post.postType === "Reel";

  return (
    <article className="post-card animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            {profileLoading ? (
              <AvatarFallback style={{ background: "oklch(var(--surface-elevated))" }}>
                <Skeleton className="w-full h-full rounded-full" />
              </AvatarFallback>
            ) : (
              <>
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback style={{ background: "oklch(var(--surface-elevated))" }}>
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
                <span className="text-sm font-semibold text-foreground">{displayName}</span>
              )}
              <PostTypeBadge type={post.postType} />
            </div>
            <span className="text-xs text-steel">{timeAgo(post.timestamp)}</span>
          </div>
        </div>
        <button type="button" className="text-steel hover:text-foreground transition-colors p-1">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Media */}
      {post.mediaUrls.length > 0 && (
        <div className="relative">
          {isVideoPost ? (
            <video
              key={post.mediaUrls[0]}
              src={post.mediaUrls[0]}
              autoPlay
              muted
              loop
              playsInline
              className="feed-image aspect-[4/3] w-full object-cover"
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
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "oklch(0 0 0 / 0.4)" }}
              >
                <Play size={22} className="text-white ml-1" fill="white" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {post.content && (
        <div className="px-4 py-3">
          <p className="text-sm text-foreground leading-relaxed">{post.content}</p>
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
          <button type="button" className="action-btn">
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
