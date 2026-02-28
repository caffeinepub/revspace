import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Principal } from "@icp-sdk/core/principal";
import { Link } from "@tanstack/react-router";
import { Heart, Image, LayoutGrid, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetAllPosts,
  useGetProfile,
  useLikePost,
  useUnlikePost,
} from "../hooks/useQueries";
import { timeAgo, truncatePrincipal } from "../utils/format";

const MODEL_SPECIALTIES = ["All", "JDM", "Euro", "Stance", "Muscle", "Other"];

// ─── Lightbox ─────────────────────────────────────────────────────────────────
interface LightboxPost {
  id: string;
  content: string;
  author: Principal;
  likes: Principal[];
  mediaUrls: string[];
  topic: string;
  timestamp: bigint;
  comments: string[];
}

function LightboxAuthor({ author }: { author: Principal }) {
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
      <Avatar className="w-9 h-9 border border-purple-400/40">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
        <AvatarFallback
          className="text-xs"
          style={{ background: "oklch(0.28 0.12 310)", color: "white" }}
        >
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div>
        <span className="text-sm font-semibold text-white group-hover:underline underline-offset-2">
          {displayName}
        </span>
        <div className="flex items-center gap-1 mt-0.5">
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
      </div>
    </Link>
  );
}

interface LightboxProps {
  post: LightboxPost;
  onClose: () => void;
  myPrincipal?: string;
}

function Lightbox({ post, onClose, myPrincipal }: LightboxProps) {
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

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 z-50"
        onClick={onClose}
        aria-label="Close lightbox"
        style={{
          background: "oklch(0 0 0 / 0.85)",
          backdropFilter: "blur(8px)",
        }}
      />

      {/* Panel */}
      <div
        className="fixed inset-4 z-[60] flex flex-col md:flex-row rounded-2xl overflow-hidden max-w-3xl mx-auto my-auto"
        style={{
          background: "oklch(0.12 0.02 260)",
          border: "1px solid oklch(0.35 0.1 310 / 0.4)",
          maxHeight: "90vh",
        }}
      >
        {/* Image */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[200px]">
          {post.mediaUrls[0] && (
            <img
              src={post.mediaUrls[0]}
              alt={post.content}
              className="w-full h-full object-contain"
              style={{ maxHeight: "60vh" }}
            />
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "oklch(0 0 0 / 0.6)" }}
            aria-label="Close"
          >
            <X size={18} color="white" />
          </button>
        </div>

        {/* Info panel */}
        <div
          className="w-full md:w-72 flex flex-col p-4 gap-4 overflow-y-auto"
          style={{ borderLeft: "1px solid oklch(1 0 0 / 0.08)" }}
        >
          {/* Author */}
          <LightboxAuthor author={post.author} />

          {/* Topic */}
          {post.topic && (
            <span
              className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full w-fit"
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
            <p className="text-sm text-white/75 leading-relaxed">
              {post.content}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleLike}
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{
                color: isLiked ? "oklch(0.7 0.22 27)" : "oklch(0.65 0.05 260)",
              }}
            >
              <Heart
                size={16}
                fill={isLiked ? "oklch(0.7 0.22 27)" : "none"}
                color={isLiked ? "oklch(0.7 0.22 27)" : "currentColor"}
              />
              <span>{post.likes.length} likes</span>
            </button>
            <span className="text-sm" style={{ color: "oklch(0.5 0.04 260)" }}>
              {post.comments.length} comments
            </span>
          </div>

          {/* Timestamp */}
          <p
            className="text-[11px] mt-auto"
            style={{ color: "oklch(0.5 0.04 260)" }}
          >
            {timeAgo(post.timestamp)}
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Gallery thumbnail ─────────────────────────────────────────────────────────
interface GalleryThumbProps {
  post: LightboxPost;
  onClick: () => void;
}

function GalleryThumb({ post, onClick }: GalleryThumbProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      className="relative aspect-square overflow-hidden rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2"
      style={{
        border: "1px solid oklch(0.3 0.08 310 / 0.3)",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={post.mediaUrls[0]}
        alt={post.content || "Model photo"}
        className="w-full h-full object-cover transition-transform duration-300"
        style={{ transform: hovered ? "scale(1.05)" : "scale(1)" }}
      />
      {/* Hover overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-1 transition-opacity duration-200"
        style={{
          background: "oklch(0 0 0 / 0.55)",
          opacity: hovered ? 1 : 0,
        }}
      >
        <Heart size={20} color="white" />
        <span className="text-white text-xs font-semibold">
          {post.likes.length}
        </span>
      </div>
    </button>
  );
}

// ─── ModelGalleryPage ─────────────────────────────────────────────────────────
export function ModelGalleryPage() {
  const { data: posts, isLoading } = useGetAllPosts();
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [lightboxPost, setLightboxPost] = useState<LightboxPost | null>(null);

  // Filter to photo posts only
  const photoPosts = (posts ?? []).filter(
    (p) => p.postType === "Photo" && p.mediaUrls.length > 0,
  );

  const displayPosts =
    selectedSpecialty === "All"
      ? photoPosts
      : photoPosts.filter(
          (p) => p.topic.toLowerCase() === selectedSpecialty.toLowerCase(),
        );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="page-header">
        <div className="flex items-center gap-2">
          <LayoutGrid size={22} style={{ color: "oklch(0.72 0.2 310)" }} />
          <h1 className="font-display text-2xl font-bold">Model Gallery</h1>
        </div>
      </header>

      <div className="px-4 pb-6">
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

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="aspect-square rounded-xl animate-pulse"
                style={{ background: "oklch(var(--surface))" }}
              />
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
              <Image size={32} style={{ color: "oklch(0.6 0.18 310)" }} />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">
              {selectedSpecialty === "All"
                ? "No Photos Yet"
                : `No "${selectedSpecialty}" Photos`}
            </h3>
            <p className="text-steel text-sm mb-6 max-w-xs">
              Upload a photo post from the Create Post page and select "Photo"
              as the type.
            </p>
            <Link to="/create">
              <Button
                style={{
                  background: "oklch(0.6 0.22 310)",
                  color: "white",
                }}
              >
                Upload Photo
              </Button>
            </Link>
          </div>
        )}

        {/* Photo grid */}
        {!isLoading && displayPosts.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {displayPosts.map((post) => (
              <GalleryThumb
                key={post.id}
                post={post}
                onClick={() => setLightboxPost(post)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPost && (
        <Lightbox
          post={lightboxPost}
          onClose={() => setLightboxPost(null)}
          myPrincipal={myPrincipal}
        />
      )}

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
