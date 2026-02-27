import { useState } from "react";
import { Car } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PostCard, PostCardSkeleton } from "../components/PostCard";
import { useGetAllPosts, useGetProfile } from "../hooks/useQueries";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAddComment, useGetComments } from "../hooks/useQueries";
import { toast } from "sonner";
import { timeAgo, truncatePrincipal } from "../utils/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import type { Principal } from "@icp-sdk/core/principal";

function CommentAuthor({ author }: { author: Principal }) {
  const { data: profile } = useGetProfile(author);
  const displayName = profile?.displayName ?? truncatePrincipal(author.toString());
  const avatarUrl = profile?.avatarUrl ?? "";
  const authorKey = author.toString();

  return (
    <div className="flex gap-2">
      <Avatar className="w-7 h-7 shrink-0">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
        <AvatarFallback className="text-[10px]">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div>
        <div className="flex items-baseline gap-2">
          <Link
            to="/profile/$userId"
            params={{ userId: authorKey }}
            className="text-xs font-semibold hover:underline underline-offset-2"
          >
            {displayName}
          </Link>
        </div>
      </div>
    </div>
  );
}

function CommentsDialog({
  postId,
  open,
  onClose,
}: {
  postId: string;
  open: boolean;
  onClose: () => void;
}) {
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
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md w-full"
        style={{ background: "oklch(var(--surface))", border: "1px solid oklch(var(--border))" }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Comments</DialogTitle>
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto space-y-3 py-2">
          {isLoading ? (
            <div className="text-center py-4 text-steel text-sm">Loading...</div>
          ) :           comments && comments.length > 0 ? (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <CommentAuthor author={c.author} />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-steel">{timeAgo(c.timestamp)}</span>
                  <p className="text-sm text-foreground">{c.content}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-4 text-steel text-sm">No comments yet. Be the first!</p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[60px] resize-none text-sm"
            style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
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
            style={{ background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }}
            className="self-end"
          >
            {addComment.isPending ? <Loader2 size={14} className="animate-spin" /> : "Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FeedPage() {
  const { data: posts, isLoading } = useGetAllPosts();
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  const displayPosts = posts ?? [];

  return (
    <div className="min-h-screen">
      {/* Header Banner */}
      <div className="relative w-full h-[260px] md:h-[360px] overflow-hidden">
        <img
          src="/assets/uploads/20a6241e809d72a3483bfd2fc4848f41-1.jpg"
          alt="RevSpace Banner"
          className="w-full h-full object-cover"
          style={{ objectPosition: "center 55%" }}
        />
        <div className="absolute inset-0 flex flex-col justify-end p-6"
          style={{ background: "linear-gradient(to top, oklch(0 0 0 / 0.75) 0%, transparent 60%)" }}>
          <h1 className="tag-text text-4xl md:text-6xl text-white" style={{ textShadow: "0 0 30px oklch(var(--orange) / 0.8)" }}>
            RevSpace
          </h1>
          <p className="text-white/70 text-sm font-medium mt-1">The streets are watching</p>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-0.5 py-2">
        {isLoading ? (
          (["s1", "s2", "s3"]).map((k) => <PostCardSkeleton key={k} />)
        ) : (
          displayPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onCommentClick={(id) => setCommentPostId(id)}
            />
          ))
        )}

        {!isLoading && displayPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(var(--surface))" }}
            >
              <Car size={28} className="text-steel" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">No posts yet</h3>
            <p className="text-steel text-sm mb-6">
              Be the first to share your build with the RevSpace community.
            </p>
            <Link to="/create">
              <Button style={{ background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }}>
                Create First Post
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-steel border-t border-border mt-4">
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

      {commentPostId && (
        <CommentsDialog
          postId={commentPostId}
          open={!!commentPostId}
          onClose={() => setCommentPostId(null)}
        />
      )}
    </div>
  );
}
