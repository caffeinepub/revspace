import { useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark, ChevronLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetAllPosts, useLikePost, useUnlikePost } from "../hooks/useQueries";
import { DEMO_POSTS, DEMO_PROFILES } from "../data/demo";
import { timeAgo, truncatePrincipal } from "../utils/format";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { toast } from "sonner";

export function ReelsPage() {
  const { data: posts } = useGetAllPosts();
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();

  const displayPosts = posts && posts.length > 0 ? posts : DEMO_POSTS;

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
        const authorKey = post.author.toString();
        const profile = DEMO_PROFILES[authorKey];
        const displayName = profile?.displayName ?? truncatePrincipal(authorKey);
        const avatarUrl = profile?.avatarUrl ?? `https://picsum.photos/seed/${authorKey}/80/80`;
        const serverLiked = myPrincipal ? post.likes.some((l) => l.toString() === myPrincipal) : false;
        const liked = likedPosts.has(post.id) || serverLiked;

        return (
          <div
            key={post.id}
            className="reel-card shrink-0"
          >
            {/* Background image */}
            <div className="absolute inset-0">
              <img
                src={post.mediaUrls[0] ?? `https://picsum.photos/seed/${post.id}/600/900`}
                alt=""
                className="w-full h-full object-cover"
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
              <div className="flex items-center gap-2 mb-3">
                <Avatar className="w-9 h-9 border-2 border-white">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-xs">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white text-sm font-semibold">{displayName}</p>
                  <p className="text-white/60 text-xs">{timeAgo(post.timestamp)}</p>
                </div>
              </div>
              <p className="text-white text-sm leading-relaxed line-clamp-3">{post.content}</p>
            </div>

            {/* Right actions */}
            <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
