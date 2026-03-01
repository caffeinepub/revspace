import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import { useNavigate } from "@tanstack/react-router";
import { MessageCircle, User, Users } from "lucide-react";
import { useGetProfile } from "../hooks/useQueries";
import { getInitials, truncatePrincipal } from "../utils/format";

interface FollowListModalProps {
  title: string;
  principals: Principal[];
  open: boolean;
  onClose: () => void;
}

function UserListItem({ principal }: { principal: Principal }) {
  const navigate = useNavigate();
  const principalStr = principal.toString();
  const { data: profile, isLoading } = useGetProfile(principal);

  const displayName = profile?.displayName || "RevSpace User";
  const avatarUrl = profile?.avatarUrl ?? "";

  const handleViewProfile = () => {
    void navigate({ to: "/profile/$userId", params: { userId: principalStr } });
  };

  const handleMessage = () => {
    void navigate({ to: "/messages", search: { recipient: principalStr } });
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors"
      style={{ borderBottom: "1px solid oklch(var(--border))" }}
    >
      {isLoading ? (
        <>
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="w-28 h-3" />
            <Skeleton className="w-20 h-2.5" />
          </div>
        </>
      ) : (
        <>
          {/* Avatar */}
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback
              style={{
                background: "oklch(var(--orange))",
                color: "oklch(var(--carbon))",
              }}
              className="text-sm font-bold"
            >
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {displayName}
            </p>
            <p className="text-[10px] text-steel font-mono truncate">
              {truncatePrincipal(principalStr)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs border-border text-steel hover:text-foreground"
              onClick={handleViewProfile}
            >
              <User size={12} className="mr-1" />
              Profile
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 px-2.5 text-xs font-bold"
              style={{
                background: "oklch(var(--orange))",
                color: "oklch(var(--carbon))",
              }}
              onClick={handleMessage}
            >
              <MessageCircle size={12} className="mr-1" />
              Chat
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function FollowListModal({
  title,
  principals,
  open,
  onClose,
}: FollowListModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-sm w-full p-0 overflow-hidden"
        style={{
          background: "oklch(var(--surface))",
          border: "1px solid oklch(var(--border))",
        }}
      >
        <DialogHeader
          className="px-4 pt-5 pb-3"
          style={{ borderBottom: "1px solid oklch(var(--border))" }}
        >
          <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
            <Users size={18} style={{ color: "oklch(var(--orange-bright))" }} />
            {title}
            <span
              className="ml-auto text-sm font-normal font-mono"
              style={{ color: "oklch(var(--steel))" }}
            >
              {principals.length}
            </span>
          </DialogTitle>
        </DialogHeader>

        {principals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: "oklch(var(--surface-elevated))" }}
            >
              <Users size={22} className="text-steel" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              No users yet
            </p>
            <p className="text-xs text-steel mt-1">
              {title === "Followers"
                ? "No one is following this account yet"
                : "Not following anyone yet"}
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div>
              {principals.map((p) => (
                <UserListItem key={p.toString()} principal={p} />
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
