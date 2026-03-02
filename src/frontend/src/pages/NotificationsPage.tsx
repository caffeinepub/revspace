import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Principal } from "@icp-sdk/core/principal";
import { useMatchRoute, useRouter } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  CheckCheck,
  ChevronRight,
  Heart,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import type { ReactElement } from "react";
import { toast } from "sonner";
import {
  useGetAllPosts,
  useGetComments,
  useGetProfile,
  useMarkNotificationRead,
  useMyNotifications,
} from "../hooks/useQueries";
import { timeAgo } from "../utils/format";

const NOTIF_ICONS: Record<string, ReactElement> = {
  like: (
    <Heart
      size={16}
      style={{ color: "oklch(0.75 0.18 27)" }}
      fill="oklch(0.75 0.18 27)"
    />
  ),
  comment: (
    <MessageCircle size={16} style={{ color: "oklch(0.65 0.18 240)" }} />
  ),
  follow: <UserPlus size={16} style={{ color: "oklch(0.65 0.2 40)" }} />,
  event: <Calendar size={16} style={{ color: "oklch(0.65 0.18 150)" }} />,
  message: <MessageCircle size={16} style={{ color: "oklch(0.6 0.18 220)" }} />,
};

const NOTIF_BG: Record<string, string> = {
  like: "oklch(0.58 0.24 27 / 0.15)",
  comment: "oklch(0.5 0.18 240 / 0.15)",
  follow: "oklch(var(--orange) / 0.15)",
  event: "oklch(0.55 0.18 150 / 0.15)",
  message: "oklch(0.5 0.18 220 / 0.15)",
};

// Types that navigate somewhere on click
const NAVIGABLE_TYPES = new Set(["comment", "follow", "message"]);

function getNotifDestination(
  notifType: string,
  relatedId: string,
): string | null {
  switch (notifType) {
    case "comment":
      // Navigate to feed — the relatedId is the postId
      return relatedId ? `/?postId=${relatedId}` : "/";
    case "follow":
      // Navigate to the follower's profile — relatedId is the principal
      return relatedId ? `/profile/${relatedId}` : null;
    case "message":
      return "/messages";
    default:
      return null;
  }
}

// ─── Per-notification enrichment components ───────────────────────────────────
// Each component calls the hooks it needs unconditionally. The parent renders
// one of these components for each notification type, avoiding conditional hook
// calls in the parent.

interface NotifItemProps {
  notif: {
    id: string;
    notifType: string;
    message: string;
    relatedId: string;
    isRead: boolean;
    timestamp: bigint;
  };
  onClick: () => void;
}

// Follow notification: resolve follower by relatedId principal string
function FollowNotifItem({ notif, onClick }: NotifItemProps) {
  let followerPrincipal: Principal | undefined;
  try {
    followerPrincipal = notif.relatedId
      ? Principal.fromText(notif.relatedId)
      : undefined;
  } catch {
    followerPrincipal = undefined;
  }

  const { data: followerProfile } = useGetProfile(followerPrincipal);
  const displayName = (followerProfile as any)?.displayName || "Someone";
  const enrichedMessage = `${displayName} started following you`;

  return (
    <NotifRow
      notif={notif}
      displayMessage={enrichedMessage}
      onClick={onClick}
    />
  );
}

// Like notification: resolve most recent liker from posts cache
function LikeNotifItem({ notif, onClick }: NotifItemProps) {
  const { data: allPosts } = useGetAllPosts();
  const post = (allPosts ?? []).find((p) => p.id === notif.relatedId);
  const likes = post?.likes ?? [];
  const lastLiker: Principal | undefined =
    likes.length > 0 ? likes[likes.length - 1] : undefined;

  const { data: likerProfile } = useGetProfile(lastLiker);
  const displayName = (likerProfile as any)?.displayName || "Someone";
  const enrichedMessage = `${displayName} liked your post`;

  return (
    <NotifRow
      notif={notif}
      displayMessage={enrichedMessage}
      onClick={onClick}
    />
  );
}

// Comment notification: resolve most recent commenter and show preview
function CommentNotifItem({ notif, onClick }: NotifItemProps) {
  const { data: comments } = useGetComments(notif.relatedId);

  // Sort comments by timestamp descending to get the most recent one
  const sortedComments = [...(comments ?? [])].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp),
  );
  const latestComment = sortedComments[0];
  const authorPrincipal: Principal | undefined = latestComment?.author;
  const commentPreview = latestComment?.content
    ? latestComment.content.length > 60
      ? `${latestComment.content.slice(0, 60)}…`
      : latestComment.content
    : undefined;

  const { data: authorProfile } = useGetProfile(authorPrincipal);
  const displayName = (authorProfile as any)?.displayName || "Someone";
  const enrichedMessage = `${displayName} commented on your post`;

  return (
    <NotifRow
      notif={notif}
      displayMessage={enrichedMessage}
      commentPreview={commentPreview}
      onClick={onClick}
    />
  );
}

// Message notification: keep as-is if already has a name, else show generic
function MessageNotifItem({ notif, onClick }: NotifItemProps) {
  // If message doesn't start with "Someone" or "You have", it's already enriched
  const isGeneric =
    notif.message.startsWith("Someone") || notif.message.startsWith("You have");

  let displayMessage = notif.message;
  if (isGeneric) {
    displayMessage = "You have a new message";
  }

  return (
    <NotifRow notif={notif} displayMessage={displayMessage} onClick={onClick} />
  );
}

// Generic notification: use original message
function GenericNotifItem({ notif, onClick }: NotifItemProps) {
  return (
    <NotifRow notif={notif} displayMessage={notif.message} onClick={onClick} />
  );
}

// ─── The actual row UI ────────────────────────────────────────────────────────

interface NotifRowProps {
  notif: {
    id: string;
    notifType: string;
    message: string;
    relatedId: string;
    isRead: boolean;
    timestamp: bigint;
  };
  displayMessage: string;
  commentPreview?: string;
  onClick: () => void;
}

function NotifRow({
  notif,
  displayMessage,
  commentPreview,
  onClick,
}: NotifRowProps) {
  const isNavigable = NAVIGABLE_TYPES.has(notif.notifType);

  return (
    <button
      type="button"
      className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-surface transition-colors w-full text-left"
      style={
        !notif.isRead
          ? { background: "oklch(var(--orange) / 0.04)" }
          : undefined
      }
      onClick={onClick}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: NOTIF_BG[notif.notifType] ?? "oklch(var(--surface))",
        }}
      >
        {NOTIF_ICONS[notif.notifType] ?? (
          <Bell size={16} className="text-steel" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${
            !notif.isRead ? "text-foreground font-semibold" : "text-steel"
          }`}
        >
          {displayMessage}
        </p>
        {commentPreview && (
          <p className="text-[11px] text-steel/70 mt-0.5 italic truncate">
            "{commentPreview}"
          </p>
        )}
        <p className="text-[11px] text-steel mt-0.5">
          {timeAgo(notif.timestamp)}
        </p>
      </div>

      {/* Right side: unread dot OR chevron for navigable */}
      <div className="flex items-center gap-1.5 shrink-0 mt-1.5">
        {!notif.isRead && (
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "oklch(var(--orange))" }}
          />
        )}
        {isNavigable && (
          <ChevronRight size={14} style={{ color: "oklch(var(--steel))" }} />
        )}
      </div>
    </button>
  );
}

// ─── Dispatcher: picks the right enrichment component per type ────────────────

function NotificationItem({ notif, onClick }: NotifItemProps) {
  switch (notif.notifType) {
    case "follow":
      return <FollowNotifItem notif={notif} onClick={onClick} />;
    case "like":
      return <LikeNotifItem notif={notif} onClick={onClick} />;
    case "comment":
      return <CommentNotifItem notif={notif} onClick={onClick} />;
    case "message":
      return <MessageNotifItem notif={notif} onClick={onClick} />;
    default:
      return <GenericNotifItem notif={notif} onClick={onClick} />;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const { data: notifications, isLoading } = useMyNotifications();
  const markRead = useMarkNotificationRead();
  const router = useRouter();
  const matchRoute = useMatchRoute();

  // If somehow viewing notifications while on /messages, suppress message-type notifs
  const isOnMessagesPage = matchRoute({ to: "/messages" }) !== false;

  const displayNotifs = (notifications ?? []).filter((n) =>
    isOnMessagesPage ? n.notifType !== "message" : true,
  );
  const unreadCount = displayNotifs.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    const unread = displayNotifs.filter((n) => !n.isRead);
    Promise.all(unread.map((n) => markRead.mutateAsync(n.id)))
      .then(() => {
        toast.success("All notifications marked as read");
      })
      .catch(() => toast.error("Failed to mark read"));
  };

  const handleNotifClick = (notif: {
    id: string;
    isRead: boolean;
    notifType: string;
    relatedId: string;
  }) => {
    // Mark as read first
    if (!notif.isRead) {
      markRead.mutate(notif.id);
    }

    // Navigate based on type — use router.history for programmatic navigation
    const dest = getNotifDestination(notif.notifType, notif.relatedId);
    if (dest) {
      router.history.push(dest);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: "oklch(var(--ember))", color: "white" }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-xs text-steel hover:text-foreground"
          >
            <CheckCheck size={14} className="mr-1" />
            Mark all read
          </Button>
        )}
      </header>

      <div className="divide-y divide-border">
        {isLoading ? (
          ["n1", "n2", "n3", "n4"].map((k) => (
            <div key={k} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="w-3/4 h-3" />
                <Skeleton className="w-1/4 h-2" />
              </div>
            </div>
          ))
        ) : displayNotifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Bell size={32} className="mb-3 text-steel" />
            <p className="text-steel text-sm">No notifications yet</p>
          </div>
        ) : (
          displayNotifs.map((notif) => (
            <NotificationItem
              key={notif.id}
              notif={notif}
              onClick={() => handleNotifClick(notif)}
            />
          ))
        )}
      </div>

      {/* Footer */}
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
