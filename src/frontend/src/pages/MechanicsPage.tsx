import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Principal } from "@icp-sdk/core/principal";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  Send,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Comment, PostView } from "../backend.d";
import {
  useAddComment,
  useCreatePost,
  useGetAllPosts,
  useGetComments,
  useGetProfile,
} from "../hooks/useQueries";
import { timeAgo, truncatePrincipal } from "../utils/format";

const CATEGORIES = [
  "Engine",
  "Suspension",
  "Electrical",
  "Transmission",
  "Brakes",
  "Body & Exterior",
  "Interior",
  "Tires & Wheels",
  "General",
];

// ─── Author Component ─────────────────────────────────────────────────────────
function PostAuthor({ author }: { author: Principal }) {
  const { data: profile } = useGetProfile(author);
  const displayName =
    profile?.displayName || truncatePrincipal(author.toString());
  const avatarUrl = profile?.avatarUrl || "";
  const authorKey = author.toString();

  return (
    <Link
      to="/profile/$userId"
      params={{ userId: authorKey }}
      className="flex items-center gap-2 group"
    >
      <Avatar className="w-7 h-7 shrink-0">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
        <AvatarFallback
          className="text-[10px] font-bold"
          style={{
            background: "oklch(var(--orange) / 0.2)",
            color: "oklch(var(--orange-bright))",
          }}
        >
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span
        className="text-sm font-semibold group-hover:underline underline-offset-2 transition-colors"
        style={{ color: "oklch(var(--steel-light))" }}
      >
        {displayName}
      </span>
    </Link>
  );
}

// ─── Comment Author ───────────────────────────────────────────────────────────
function CommentAuthor({ author }: { author: Principal }) {
  const { data: profile } = useGetProfile(author);
  const displayName =
    profile?.displayName || truncatePrincipal(author.toString());
  const avatarUrl = profile?.avatarUrl || "";
  const authorKey = author.toString();

  return (
    <Link
      to="/profile/$userId"
      params={{ userId: authorKey }}
      className="flex items-center gap-1.5 group shrink-0"
    >
      <Avatar className="w-5 h-5">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
        <AvatarFallback
          className="text-[8px] font-bold"
          style={{
            background: "oklch(var(--orange) / 0.15)",
            color: "oklch(var(--orange-bright))",
          }}
        >
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span
        className="text-xs font-semibold group-hover:underline underline-offset-1"
        style={{ color: "oklch(var(--orange-bright))" }}
      >
        {displayName}
      </span>
    </Link>
  );
}

// ─── Comment Item ─────────────────────────────────────────────────────────────
function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div
      className="flex gap-3 px-3 py-2.5 rounded-lg"
      style={{ background: "oklch(var(--surface-elevated) / 0.5)" }}
    >
      <CommentAuthor author={comment.author} />
      <div className="flex-1 min-w-0">
        <p
          className="text-sm leading-relaxed"
          style={{ color: "oklch(var(--foreground))" }}
        >
          {comment.content}
        </p>
        <span
          className="text-[10px] mt-0.5 block"
          style={{ color: "oklch(var(--steel))" }}
        >
          {timeAgo(comment.timestamp)}
        </span>
      </div>
    </div>
  );
}

// ─── Inline Comment Section ───────────────────────────────────────────────────
function CommentSection({ postId }: { postId: string }) {
  const [text, setText] = useState("");
  const { data: comments, isLoading } = useGetComments(postId);
  const addComment = useAddComment();

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addComment.mutate(
      { postId, content: trimmed },
      {
        onSuccess: () => {
          setText("");
          toast.success("Reply posted!");
        },
        onError: () => toast.error("Failed to post reply"),
      },
    );
  };

  return (
    <div
      className="mt-3 rounded-lg overflow-hidden"
      style={{
        background: "oklch(var(--surface) / 0.6)",
        border: "1px solid oklch(var(--border) / 0.5)",
      }}
    >
      {/* Comment list */}
      <div className="p-3 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((k) => (
              <div key={k} className="flex gap-2 items-start">
                <Skeleton className="w-5 h-5 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-1.5">
            {comments.map((c) => (
              <CommentItem key={c.id} comment={c} />
            ))}
          </div>
        ) : (
          <p
            className="text-xs text-center py-2"
            style={{ color: "oklch(var(--steel))" }}
          >
            No replies yet — be the first to help!
          </p>
        )}
      </div>

      {/* Reply input */}
      <div
        className="flex gap-2 px-3 pb-3 pt-1"
        style={{ borderTop: "1px solid oklch(var(--border) / 0.4)" }}
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a reply..."
          className="min-h-[40px] max-h-24 resize-none text-sm py-2"
          style={{
            background: "oklch(var(--surface-elevated))",
            borderColor: "oklch(var(--border))",
            color: "oklch(var(--foreground))",
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
          size="sm"
          className="self-end shrink-0"
          style={{
            background: text.trim()
              ? "oklch(var(--orange))"
              : "oklch(var(--surface-elevated))",
            color: text.trim() ? "oklch(var(--carbon))" : "oklch(var(--steel))",
            transition: "all 0.2s",
          }}
        >
          {addComment.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────
function QuestionCard({ post }: { post: PostView }) {
  const commentCount = post.comments.length;

  return (
    <article
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: "oklch(var(--surface))",
        border: "1px solid oklch(var(--border))",
        boxShadow: "0 2px 8px oklch(0 0 0 / 0.2)",
      }}
    >
      {/* Card header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <PostAuthor author={post.author} />
            <span
              className="text-xs flex items-center gap-1"
              style={{ color: "oklch(var(--steel))" }}
            >
              <Clock size={11} />
              {timeAgo(post.timestamp)}
            </span>
          </div>
          {/* Category badge */}
          {post.topic && (
            <span
              className="shrink-0 text-[11px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wide"
              style={{
                background: "oklch(var(--orange) / 0.15)",
                color: "oklch(var(--orange-bright))",
                border: "1px solid oklch(var(--orange) / 0.25)",
                letterSpacing: "0.04em",
              }}
            >
              {post.topic}
            </span>
          )}
        </div>

        {/* Question text */}
        <p
          className="text-base leading-relaxed font-medium"
          style={{ color: "oklch(var(--foreground))" }}
        >
          {post.content}
        </p>

        {/* Comment count */}
        <div
          className="flex items-center gap-1.5 mt-3 text-xs"
          style={{ color: "oklch(var(--steel))" }}
        >
          <MessageSquare size={13} />
          <span>
            {commentCount === 0
              ? "No replies"
              : commentCount === 1
                ? "1 reply"
                : `${commentCount} replies`}
          </span>
        </div>
      </div>

      {/* Comment section — always visible */}
      <div className="px-4 pb-4">
        <CommentSection postId={post.id} />
      </div>
    </article>
  );
}

// ─── Question Card Skeleton ───────────────────────────────────────────────────
function QuestionCardSkeleton() {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: "oklch(var(--surface))",
        border: "1px solid oklch(var(--border))",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div
        className="rounded-lg p-3 space-y-2"
        style={{ background: "oklch(var(--surface) / 0.6)" }}
      >
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  );
}

// ─── Ask Question Form ────────────────────────────────────────────────────────
function AskQuestionForm({ onSuccess }: { onSuccess: () => void }) {
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("General");
  const createPost = useCreatePost();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    createPost.mutate(
      {
        content: trimmed,
        mediaUrls: [],
        postType: "mechanics",
        topic: category,
      },
      {
        onSuccess: () => {
          setQuestion("");
          setCategory("General");
          toast.success("Question posted!");
          onSuccess();
        },
        onError: () =>
          toast.error("Failed to post question. Please try again."),
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl p-4 mb-6"
      style={{
        background: "oklch(var(--surface))",
        border: "1px solid oklch(var(--orange) / 0.2)",
        boxShadow: "0 0 20px oklch(var(--orange) / 0.06)",
      }}
    >
      <h2
        className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
        style={{ color: "oklch(var(--orange-bright))" }}
      >
        <Wrench size={14} />
        Ask the Community
      </h2>

      <Textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Describe your issue or question in detail..."
        className="min-h-[88px] resize-none text-sm mb-3"
        style={{
          background: "oklch(var(--surface-elevated))",
          borderColor: "oklch(var(--border))",
          color: "oklch(var(--foreground))",
        }}
      />

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className="text-xs px-3 py-1 rounded-full font-medium transition-all duration-150"
            style={
              category === cat
                ? {
                    background: "oklch(var(--orange))",
                    color: "oklch(var(--carbon))",
                    border: "1px solid oklch(var(--orange))",
                  }
                : {
                    background: "oklch(var(--surface-elevated))",
                    color: "oklch(var(--steel-light))",
                    border: "1px solid oklch(var(--border))",
                  }
            }
          >
            {cat}
          </button>
        ))}
      </div>

      <Button
        type="submit"
        disabled={!question.trim() || createPost.isPending}
        className="w-full font-semibold"
        style={{
          background: question.trim()
            ? "oklch(var(--orange))"
            : "oklch(var(--surface-elevated))",
          color: question.trim()
            ? "oklch(var(--carbon))"
            : "oklch(var(--steel))",
          transition: "all 0.2s",
        }}
      >
        {createPost.isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Posting...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <ChevronRight size={14} />
            Post Question
          </span>
        )}
      </Button>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function MechanicsPage() {
  const { data: allPosts, isLoading } = useGetAllPosts();
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const mechanicsPosts = (allPosts ?? [])
    .filter((p) => p.postType === "mechanics")
    .sort((a, b) => Number(b.timestamp - a.timestamp));

  const filteredPosts = filterCategory
    ? mechanicsPosts.filter((p) => p.topic === filterCategory)
    : mechanicsPosts;

  // Get unique categories that have been used
  const usedCategories = Array.from(
    new Set(
      mechanicsPosts.map((p) => p.topic).filter((t): t is string => Boolean(t)),
    ),
  );

  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(var(--background))" }}
    >
      {/* Page header */}
      <div
        className="relative px-4 pt-6 pb-5"
        style={{
          background:
            "linear-gradient(180deg, oklch(var(--surface)) 0%, oklch(var(--background)) 100%)",
          borderBottom: "1px solid oklch(var(--border))",
        }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "oklch(var(--orange) / 0.15)",
                border: "1px solid oklch(var(--orange) / 0.3)",
              }}
            >
              <Wrench
                size={18}
                style={{ color: "oklch(var(--orange-bright))" }}
              />
            </div>
            <div>
              <h1
                className="text-2xl font-extrabold uppercase tracking-wide"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  color: "oklch(var(--foreground))",
                  lineHeight: 1,
                }}
              >
                Mechanics Q&amp;A
              </h1>
              <p
                className="text-xs mt-0.5"
                style={{ color: "oklch(var(--steel-light))" }}
              >
                Ask a question · Get answers from the community
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Ask Question Form */}
        <AskQuestionForm onSuccess={() => {}} />

        {/* Category filter (only shows if there are posts with categories) */}
        {usedCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              type="button"
              onClick={() => setFilterCategory(null)}
              className="text-xs px-3 py-1 rounded-full font-medium transition-all duration-150"
              style={
                !filterCategory
                  ? {
                      background: "oklch(var(--steel) / 0.3)",
                      color: "oklch(var(--foreground))",
                      border: "1px solid oklch(var(--border))",
                    }
                  : {
                      background: "transparent",
                      color: "oklch(var(--steel-light))",
                      border: "1px solid oklch(var(--border))",
                    }
              }
            >
              All Topics
            </button>
            {usedCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  setFilterCategory(cat === filterCategory ? null : cat)
                }
                className="text-xs px-3 py-1 rounded-full font-medium transition-all duration-150"
                style={
                  filterCategory === cat
                    ? {
                        background: "oklch(var(--orange) / 0.2)",
                        color: "oklch(var(--orange-bright))",
                        border: "1px solid oklch(var(--orange) / 0.3)",
                      }
                    : {
                        background: "transparent",
                        color: "oklch(var(--steel-light))",
                        border: "1px solid oklch(var(--border))",
                      }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Posts list */}
        <div className="space-y-4">
          {isLoading ? (
            <>
              <QuestionCardSkeleton />
              <QuestionCardSkeleton />
              <QuestionCardSkeleton />
            </>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <QuestionCard key={post.id} post={post} />
            ))
          ) : (
            <div
              className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl"
              style={{
                background: "oklch(var(--surface))",
                border: "1px dashed oklch(var(--border))",
              }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: "oklch(var(--orange) / 0.1)",
                  border: "1px solid oklch(var(--orange) / 0.2)",
                }}
              >
                <Wrench
                  size={24}
                  style={{ color: "oklch(var(--orange-bright))" }}
                />
              </div>
              <h3
                className="text-lg font-bold uppercase tracking-wide mb-2"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  color: "oklch(var(--foreground))",
                }}
              >
                {filterCategory
                  ? `No ${filterCategory} questions yet`
                  : "No questions yet"}
              </h3>
              <p
                className="text-sm max-w-xs"
                style={{ color: "oklch(var(--steel-light))" }}
              >
                {filterCategory
                  ? "Try a different category or be the first to ask a question in this topic."
                  : "Be the first to ask the community a question! Get answers from fellow car enthusiasts."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer
          className="py-8 text-center text-xs border-t border-border mt-8"
          style={{ color: "oklch(var(--steel))" }}
        >
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              typeof window !== "undefined" ? window.location.hostname : "",
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange hover:underline"
          >
            caffeine.ai
          </a>
        </footer>
      </div>
    </div>
  );
}
