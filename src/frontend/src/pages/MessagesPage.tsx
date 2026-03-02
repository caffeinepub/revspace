import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import { Principal as PrincipalCls } from "@icp-sdk/core/principal";
import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  UserSearch,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetConversations,
  useGetMessages,
  useGetProfile,
  useMarkNotificationRead,
  useMyNotifications,
  useMyProfile,
  useSendMessage,
  useSendNotificationToUser,
} from "../hooks/useQueries";
import { timeAgo } from "../utils/format";

function ConversationItem({
  principal,
  onSelect,
}: {
  principal: Principal;
  onSelect: (p: Principal) => void;
}) {
  const { data: profile } = useGetProfile(principal);
  const key = principal.toString();
  const name = profile?.displayName ?? "RevSpace User";
  const initial = name.slice(0, 2).toUpperCase();

  return (
    <button
      key={key}
      type="button"
      className="flex items-center gap-3 px-4 py-3.5 w-full text-left hover:bg-surface transition-colors"
      onClick={() => onSelect(principal)}
    >
      <Avatar className="w-12 h-12 shrink-0">
        {profile?.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={name}
            className="w-full h-full object-cover rounded-full"
          />
        ) : null}
        <AvatarFallback
          style={{
            background: "oklch(var(--surface-elevated))",
            color: "oklch(var(--orange-bright))",
          }}
          className="font-bold text-sm"
        >
          {initial}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{name}</p>
        <p className="text-xs text-steel truncate mt-0.5">
          Tap to view conversation
        </p>
      </div>
      <MessageCircle size={14} className="text-steel shrink-0" />
    </button>
  );
}

function ConversationList({
  conversations,
  onSelect,
}: {
  conversations: Principal[];
  onSelect: (p: Principal) => void;
}) {
  return (
    <div className="divide-y divide-border">
      {conversations.map((convo) => (
        <ConversationItem
          key={convo.toString()}
          principal={convo}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function ChatView({
  recipient,
  myPrincipal,
  onBack,
}: {
  recipient: Principal;
  myPrincipal: string;
  onBack: () => void;
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: messages, isLoading } = useGetMessages(recipient);
  const sendMessage = useSendMessage();
  const sendNotification = useSendNotificationToUser();
  const { data: recipientProfile } = useGetProfile(recipient);
  const { data: myProfile } = useMyProfile();

  const recipientName = recipientProfile?.displayName ?? "RevSpace User";
  const senderName = myProfile?.displayName ?? "RevSpace User";

  const displayMessages = messages ?? [];

  // Scroll to bottom whenever messages change
  const prevCountRef = useRef(0);
  if (prevCountRef.current !== displayMessages.length) {
    prevCountRef.current = displayMessages.length;
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  }

  const handleSend = () => {
    if (!text.trim()) return;
    const content = text.trim();
    sendMessage.mutate(
      { receiver: recipient, content },
      {
        onSuccess: () => {
          setText("");
          sendNotification.mutate({
            targetUser: recipient,
            notifType: "message",
            message: `${senderName} sent you a message`,
            relatedId: "",
          });
        },
        onError: () => toast.error("Failed to send message"),
      },
    );
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="page-header shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-steel hover:text-foreground"
          >
            <ArrowLeft size={20} />
          </button>
          <Avatar className="w-8 h-8">
            <AvatarFallback
              style={{
                background: "oklch(var(--orange) / 0.2)",
                color: "oklch(var(--orange-bright))",
              }}
              className="text-xs font-bold"
            >
              {recipientName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <p className="font-semibold text-sm">{recipientName}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="w-48 h-10 rounded-2xl" />
            <Skeleton className="w-64 h-10 rounded-2xl ml-auto" />
            <Skeleton className="w-40 h-8 rounded-2xl" />
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: "oklch(var(--surface))" }}
            >
              <MessageCircle size={24} className="text-steel" />
            </div>
            <p className="text-foreground font-semibold text-sm">
              No messages yet
            </p>
            <p className="text-steel text-xs mt-1">
              Say hello and start the conversation!
            </p>
          </div>
        ) : (
          displayMessages.map((msg) => {
            const isMine = msg.sender.toString() === myPrincipal;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div>
                  <div
                    className={
                      isMine ? "message-bubble-me" : "message-bubble-other"
                    }
                  >
                    {msg.content}
                  </div>
                  <p
                    className={`text-[10px] text-steel mt-0.5 ${isMine ? "text-right" : "text-left"}`}
                  >
                    {timeAgo(msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{
          background: "oklch(var(--carbon))",
          borderTop: "1px solid oklch(var(--border))",
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message..."
          className="flex-1 text-sm"
          style={{
            background: "oklch(var(--surface))",
            borderColor: "oklch(var(--border))",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || sendMessage.isPending}
          size="icon"
          style={{
            background: "oklch(var(--orange))",
            color: "oklch(var(--carbon))",
          }}
        >
          {sendMessage.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </Button>
      </div>
    </div>
  );
}

function NewChatDialog({
  open,
  onClose,
  onStart,
}: {
  open: boolean;
  onClose: () => void;
  onStart: (p: Principal) => void;
}) {
  const [principalInput, setPrincipalInput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = principalInput.trim();
    if (!trimmed) {
      setError("Please enter a Principal ID");
      return;
    }
    try {
      const principal = PrincipalCls.fromText(trimmed);
      onStart(principal);
      setPrincipalInput("");
      onClose();
    } catch {
      setError("Invalid Principal ID. Please check and try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-sm w-full"
        style={{
          background: "oklch(var(--surface))",
          border: "1px solid oklch(var(--border))",
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <UserSearch size={18} className="text-orange" />
            Start New Chat
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-steel mb-1.5 block uppercase tracking-wider font-semibold">
              User's Principal ID
            </Label>
            <Input
              value={principalInput}
              onChange={(e) => {
                setPrincipalInput(e.target.value);
                setError("");
              }}
              placeholder="xxxxx-xxxxx-xxxxx-..."
              className="font-mono text-xs"
              style={{
                background: "oklch(var(--surface-elevated))",
                borderColor: error
                  ? "oklch(var(--destructive))"
                  : "oklch(var(--border))",
              }}
            />
            {error && (
              <p
                className="text-xs mt-1"
                style={{ color: "oklch(var(--destructive))" }}
              >
                {error}
              </p>
            )}
            <p className="text-xs text-steel mt-1.5">
              Ask the user to share their Principal ID from their profile page.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full font-bold"
            style={{
              background: "oklch(var(--orange))",
              color: "oklch(var(--carbon))",
            }}
          >
            Start Conversation
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MessagesPage() {
  const { data: conversations, isLoading } = useGetConversations();
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString() ?? "";
  const { recipient } = useSearch({ from: "/messages" });
  const { data: notifications } = useMyNotifications();
  const markRead = useMarkNotificationRead();
  const queryClient = useQueryClient();
  const hasAutoMarked = useRef(false);

  // Auto-mark all unread message-type notifications as read when the page loads
  useEffect(() => {
    if (hasAutoMarked.current) return;
    if (!notifications || notifications.length === 0) return;
    const unreadMessages = notifications.filter(
      (n) => !n.isRead && n.notifType === "message",
    );
    if (unreadMessages.length === 0) return;
    hasAutoMarked.current = true;
    const markAll = async () => {
      await Promise.all(unreadMessages.map((n) => markRead.mutateAsync(n.id)));
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    markAll().catch(() => {});
  }, [notifications, markRead, queryClient]);

  // Auto-open a conversation if recipient is provided in search params
  const [selectedConvo, setSelectedConvo] = useState<Principal | null>(() => {
    if (!recipient) return null;
    try {
      return PrincipalCls.fromText(recipient);
    } catch {
      return null;
    }
  });
  const [showNewChat, setShowNewChat] = useState(false);

  const displayConvos = conversations ?? [];

  if (selectedConvo) {
    return (
      <ChatView
        recipient={selectedConvo}
        myPrincipal={myPrincipal}
        onBack={() => setSelectedConvo(null)}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <h1 className="font-display text-2xl font-bold">Messages</h1>
        <Button
          type="button"
          size="sm"
          onClick={() => setShowNewChat(true)}
          style={{
            background: "oklch(var(--orange))",
            color: "oklch(var(--carbon))",
          }}
        >
          <Plus size={14} className="mr-1" />
          New Chat
        </Button>
      </header>

      {isLoading ? (
        <div className="divide-y divide-border">
          {["c1", "c2", "c3"].map((k) => (
            <div key={k} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="w-12 h-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="w-32 h-3" />
                <Skeleton className="w-48 h-2.5" />
              </div>
            </div>
          ))}
        </div>
      ) : displayConvos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "oklch(var(--surface))" }}
          >
            <MessageCircle size={28} className="text-steel" />
          </div>
          <p className="text-foreground font-semibold text-sm">
            No conversations yet
          </p>
          <p className="text-steel text-xs mt-1 mb-6">
            Find someone to chat with by tapping the button below
          </p>
          <Button
            type="button"
            onClick={() => setShowNewChat(true)}
            style={{
              background: "oklch(var(--orange))",
              color: "oklch(var(--carbon))",
            }}
          >
            <Plus size={14} className="mr-2" />
            Start a Conversation
          </Button>
        </div>
      ) : (
        <ConversationList
          conversations={displayConvos}
          onSelect={setSelectedConvo}
        />
      )}

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

      <NewChatDialog
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        onStart={(p) => setSelectedConvo(p)}
      />
    </div>
  );
}
