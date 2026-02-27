import type { ReactElement } from "react";
import { Heart, MessageCircle, UserPlus, Calendar, Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyNotifications, useMarkNotificationRead } from "../hooks/useQueries";
import { timeAgo } from "../utils/format";
import { toast } from "sonner";

const NOTIF_ICONS: Record<string, ReactElement> = {
  like: <Heart size={16} style={{ color: "oklch(0.75 0.18 27)" }} fill="oklch(0.75 0.18 27)" />,
  comment: <MessageCircle size={16} style={{ color: "oklch(0.65 0.18 240)" }} />,
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

export function NotificationsPage() {
  const { data: notifications, isLoading } = useMyNotifications();
  const markRead = useMarkNotificationRead();

  const displayNotifs = notifications ?? [];
  const unreadCount = displayNotifs.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    const unread = displayNotifs.filter((n) => !n.isRead);
    Promise.all(unread.map((n) => markRead.mutateAsync(n.id))).then(() => {
      toast.success("All notifications marked as read");
    }).catch(() => toast.error("Failed to mark read"));
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
          (["n1","n2","n3","n4"]).map((k) => (
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
            <button
              key={notif.id}
              type="button"
              className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-surface transition-colors w-full text-left"
              style={!notif.isRead ? { background: "oklch(var(--orange) / 0.04)" } : undefined}
              onClick={() => {
                if (!notif.isRead) {
                  markRead.mutate(notif.id);
                }
              }}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: NOTIF_BG[notif.notifType] ?? "oklch(var(--surface))" }}
              >
                {NOTIF_ICONS[notif.notifType] ?? <Bell size={16} className="text-steel" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${!notif.isRead ? "text-foreground font-medium" : "text-steel"}`}>
                  {notif.message}
                </p>
                <p className="text-[11px] text-steel mt-0.5">{timeAgo(notif.timestamp)}</p>
              </div>

              {/* Unread dot */}
              {!notif.isRead && (
                <div
                  className="w-2 h-2 rounded-full shrink-0 mt-2"
                  style={{ background: "oklch(var(--orange))" }}
                />
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-steel border-t border-border mt-4">
        © 2026. Built with ❤️ using{" "}
        <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="text-orange hover:underline">
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
