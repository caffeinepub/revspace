import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Principal } from "@icp-sdk/core/principal";
import { Link } from "@tanstack/react-router";
import { Car, CornerDownRight, Crown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PostCard, PostCardSkeleton } from "../components/PostCard";
import {
  useAddComment,
  useAddCommentReply,
  useGetAllPosts,
  useGetCommentReplies,
  useGetComments,
  useGetProfile,
} from "../hooks/useQueries";
import { timeAgo, truncatePrincipal } from "../utils/format";

function CommentAuthor({ author }: { author: Principal }) {
  const { data: profile } = useGetProfile(author);
  const displayName =
    profile?.displayName ?? truncatePrincipal(author.toString());
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

/** Shows replies for a single comment with expand/collapse toggle */
function CommentRepliesSection({
  commentId,
  postId,
}: {
  commentId: string;
  postId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);
  const { data: replies, isLoading: repliesLoading } = useGetCommentReplies(
    expanded || replyOpen ? commentId : null,
  );
  const addReply = useAddCommentReply();

  const replyCount = replies?.length ?? 0;

  const handleReplySubmit = () => {
    if (!replyText.trim()) return;
    addReply.mutate(
      { postId, parentCommentId: commentId, content: replyText.trim() },
      {
        onSuccess: () => {
          setReplyText("");
          setReplyOpen(false);
          setExpanded(true);
          toast.success("Reply sent");
        },
        onError: () => toast.error("Failed to send reply"),
      },
    );
  };

  return (
    <div className="mt-1.5 ml-9">
      {/* Action row: Reply button + View replies */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-ocid="comment.reply.button"
          onClick={() => setReplyOpen((v) => !v)}
          className="flex items-center gap-1 text-[11px] text-steel hover:text-foreground transition-colors"
        >
          <CornerDownRight size={11} />
          Reply
        </button>
        {replyCount > 0 && (
          <button
            type="button"
            data-ocid="comment.replies.toggle"
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] font-medium transition-colors"
            style={{ color: "oklch(var(--orange))" }}
          >
            {expanded
              ? "Hide replies"
              : `View ${replyCount} repl${replyCount === 1 ? "y" : "ies"}`}
          </button>
        )}
      </div>

      {/* Inline reply input */}
      {replyOpen && (
        <div className="flex items-center gap-2 mt-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            data-ocid="comment.reply.input"
            className="h-8 text-xs"
            style={{
              background: "oklch(var(--surface-elevated))",
              borderColor: "oklch(var(--border))",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleReplySubmit();
              }
              if (e.key === "Escape") setReplyOpen(false);
            }}
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            data-ocid="comment.reply.submit_button"
            onClick={handleReplySubmit}
            disabled={!replyText.trim() || addReply.isPending}
            className="h-8 px-3 text-xs shrink-0"
            style={{
              background: "oklch(var(--orange))",
              color: "oklch(var(--carbon))",
            }}
          >
            {addReply.isPending ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              "Post"
            )}
          </Button>
          <button
            type="button"
            data-ocid="comment.reply.cancel_button"
            onClick={() => {
              setReplyOpen(false);
              setReplyText("");
            }}
            className="text-[11px] text-steel hover:text-foreground transition-colors shrink-0"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Expanded replies list */}
      {expanded && (
        <div
          className="mt-2 space-y-2 pl-3"
          style={{ borderLeft: "2px solid oklch(var(--orange) / 0.35)" }}
        >
          {repliesLoading ? (
            <div className="text-[11px] text-steel py-1">
              Loading replies...
            </div>
          ) : replies && replies.length > 0 ? (
            replies.map((r, idx) => (
              <div
                key={r.id}
                data-ocid={`comment.replies.item.${idx + 1}`}
                className="flex gap-2"
              >
                <Avatar className="w-6 h-6 shrink-0">
                  <AvatarFallback className="text-[9px]">
                    {r.author.toString().slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CommentAuthor author={r.author} />
                  <p className="text-xs text-foreground mt-0.5">{r.content}</p>
                  <span className="text-[10px] text-steel">
                    {timeAgo(r.timestamp)}
                  </span>
                </div>
              </div>
            ))
          ) : null}
        </div>
      )}
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

  // Only show top-level comments (no parentCommentId)
  const topLevelComments = (comments ?? []).filter((c) => !c.parentCommentId);

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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md w-full"
        data-ocid="comments.dialog"
        style={{
          background: "oklch(var(--surface))",
          border: "1px solid oklch(var(--border))",
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Comments</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-4 py-2 pr-1">
          {isLoading ? (
            <div
              className="text-center py-4 text-steel text-sm"
              data-ocid="comments.loading_state"
            >
              Loading...
            </div>
          ) : topLevelComments.length > 0 ? (
            topLevelComments.map((c, idx) => (
              <div
                key={c.id}
                data-ocid={`comments.item.${idx + 1}`}
                className="space-y-0.5"
              >
                <div className="flex gap-2">
                  <CommentAuthor author={c.author} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-steel">
                      {timeAgo(c.timestamp)}
                    </span>
                    <p className="text-sm text-foreground">{c.content}</p>
                  </div>
                </div>
                {/* Replies section per comment */}
                <CommentRepliesSection commentId={c.id} postId={postId} />
              </div>
            ))
          ) : (
            <p
              className="text-center py-4 text-steel text-sm"
              data-ocid="comments.empty_state"
            >
              No comments yet. Be the first!
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment..."
            data-ocid="comments.textarea"
            className="min-h-[60px] resize-none text-sm"
            style={{
              background: "oklch(var(--surface-elevated))",
              borderColor: "oklch(var(--border))",
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
            data-ocid="comments.submit_button"
            onClick={handleSubmit}
            disabled={!text.trim() || addComment.isPending}
            style={{
              background: "oklch(var(--orange))",
              color: "oklch(var(--carbon))",
            }}
            className="self-end"
          >
            {addComment.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              "Post"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FeedPage() {
  const { data: posts, isLoading } = useGetAllPosts();
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  const displayPosts = [...(posts ?? [])].sort((a, b) =>
    Number(b.timestamp - a.timestamp),
  );

  const memberCount = posts
    ? new Set(posts.map((p) => p.author.toString())).size
    : null;

  return (
    <div className="min-h-screen">
      {/* Header Banner */}
      <div
        className="relative w-full h-[260px] md:h-[360px] overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #0d0d0d 100%)",
        }}
      >
        <img
          src="/assets/generated/feed-banner.dim_1200x400.jpg"
          alt="RevSpace Banner"
          className="w-full h-full object-cover"
          style={{ objectPosition: "center 60%" }}
          onError={(e) => {
            const img = e.currentTarget;
            img.style.display = "none";
            if (img.parentElement) {
              img.parentElement.style.background =
                "linear-gradient(135deg, #0a0a0a 0%, #1c0a00 40%, #0f0800 70%, #0a0a0a 100%)";
            }
          }}
        />
        <div
          className="absolute inset-0 flex flex-col justify-between p-6"
          style={{
            background:
              "linear-gradient(to top, oklch(0 0 0 / 0.75) 0%, oklch(0 0 0 / 0.25) 100%)",
          }}
        >
          {/* Go Pro button at top right */}
          <div className="flex justify-end">
            <Link to="/pro">
              <Button
                size="sm"
                className="font-bold tracking-wide shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #f97316)",
                  color: "#000",
                  border: "none",
                }}
              >
                <Crown size={14} className="mr-1.5" />
                Go Pro
              </Button>
            </Link>
          </div>

          {/* Title at bottom */}
          <div>
            <h1
              className="tag-text text-4xl md:text-6xl text-white"
              style={{ textShadow: "0 0 30px oklch(var(--orange) / 0.8)" }}
            >
              RevSpace
            </h1>
            <p className="text-white/70 text-sm font-medium mt-1">
              The streets are watching
            </p>
            {isLoading ? (
              <span
                className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold animate-pulse"
                style={{
                  background: "oklch(var(--orange) / 0.1)",
                  color: "oklch(var(--orange) / 0.5)",
                  border: "1px solid oklch(var(--orange) / 0.2)",
                }}
              >
                Loading members...
              </span>
            ) : (
              memberCount !== null && (
                <span
                  className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: "oklch(var(--orange) / 0.15)",
                    color: "oklch(var(--orange))",
                    border: "1px solid oklch(var(--orange) / 0.4)",
                  }}
                >
                  {memberCount.toLocaleString()} members
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-0.5 py-2">
        {isLoading
          ? ["s1", "s2", "s3"].map((k) => <PostCardSkeleton key={k} />)
          : displayPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onCommentClick={(id) => setCommentPostId(id)}
              />
            ))}

        {!isLoading && displayPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(var(--surface))" }}
            >
              <Car size={28} className="text-steel" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">
              No posts yet
            </h3>
            <p className="text-steel text-sm mb-6">
              Be the first to share your build with the RevSpace community.
            </p>
            <Link to="/create">
              <Button
                style={{
                  background: "oklch(var(--orange))",
                  color: "oklch(var(--carbon))",
                }}
              >
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
