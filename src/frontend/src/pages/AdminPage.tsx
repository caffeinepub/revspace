import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Principal } from "@icp-sdk/core/principal";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Copy,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Loader2,
  Package,
  Plus,
  ShieldCheck,
  Tag,
  Trash2,
  UserX,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  Listing,
  PostView,
  ProfileWithPrincipal,
  UserRole,
  UserWithRole,
} from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { decodeMetaFromLocation, encodeMetaToLocation } from "../lib/userMeta";

// ── helpers ──────────────────────────────────────────────────────────────────

function truncPrincipal(p: Principal): string {
  const s = p.toString();
  return s.length > 16 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s;
}

function formatTs(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type MergedUser = {
  principal: Principal;
  role: UserRole;
  displayName: string;
  avatarUrl: string;
  revBucks: number;
  isPro: boolean;
  isModel: boolean;
  locationRaw: string; // the full encoded location string
};

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "admin") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide"
        style={{
          background: "oklch(0.55 0.22 75 / 0.2)",
          color: "oklch(0.85 0.22 75)",
          border: "1px solid oklch(0.55 0.22 75 / 0.4)",
        }}
      >
        <ShieldCheck size={10} />
        Admin
      </span>
    );
  }
  if (role === "guest") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide"
        style={{
          background: "oklch(var(--ember) / 0.2)",
          color: "oklch(0.75 0.22 27)",
          border: "1px solid oklch(var(--ember) / 0.4)",
        }}
      >
        <Ban size={10} />
        Banned
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide"
      style={{
        background: "oklch(var(--steel) / 0.2)",
        color: "oklch(var(--steel-light))",
        border: "1px solid oklch(var(--steel) / 0.3)",
      }}
    >
      User
    </span>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{ background: "oklch(var(--surface))" }}
    >
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2.5 w-48" />
      </div>
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab({
  actor,
  myPrincipal,
}: {
  actor: ReturnType<typeof useActor>["actor"];
  myPrincipal: string | undefined;
}) {
  const [users, setUsers] = useState<MergedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  // Per-user RB input values
  const [rbInputs, setRbInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!actor) return;
    setLoading(true);
    // Use adminGetAllProfiles() as primary source — it has EVERY user who saved a profile.
    // adminGetAllUsers() is secondary — just provides role data.
    Promise.all([actor.adminGetAllProfiles(), actor.adminGetAllUsers()])
      .then(
        ([profilesArr, usersArr]: [ProfileWithPrincipal[], UserWithRole[]]) => {
          // Build a role lookup from the users list
          const roleMap = new Map<string, UserRole>();
          for (const u of usersArr) {
            roleMap.set(u.principal.toString(), u.role);
          }

          const merged: MergedUser[] = profilesArr.map((pp) => {
            const meta = decodeMetaFromLocation(pp.profile.location ?? "");
            return {
              principal: pp.principal,
              role:
                roleMap.get(pp.principal.toString()) ?? ("user" as UserRole),
              displayName:
                pp.profile.displayName || truncPrincipal(pp.principal),
              avatarUrl: pp.profile.avatarUrl || "",
              revBucks: meta.rb,
              isPro: meta.isPro,
              isModel: meta.isModel,
              locationRaw: pp.profile.location ?? "",
            };
          });

          // Sort: admins first, then alphabetically by display name
          merged.sort((a, b) => {
            if (a.role === "admin" && b.role !== "admin") return -1;
            if (b.role === "admin" && a.role !== "admin") return 1;
            return a.displayName.localeCompare(b.displayName);
          });

          setUsers(merged);
        },
      )
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, [actor]);

  async function handleDeleteProfile(principal: Principal) {
    if (!actor) return;
    const key = `del-${principal.toString()}`;
    setPendingAction(key);
    try {
      await actor.adminDeleteProfile(principal);
      setUsers((prev) =>
        prev.filter((u) => u.principal.toString() !== principal.toString()),
      );
      toast.success("Profile deleted");
    } catch {
      toast.error("Failed to delete profile");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBanToggle(user: MergedUser) {
    if (!actor) return;
    const isBanned = user.role === "guest";
    const key = `ban-${user.principal.toString()}`;
    setPendingAction(key);
    try {
      if (isBanned) {
        await actor.adminUnbanUser(user.principal);
        toast.success(`${user.displayName} unbanned`);
      } else {
        await actor.adminBanUser(user.principal);
        toast.success(`${user.displayName} banned`);
      }
      // Refresh roles
      const refreshed = await actor.adminGetAllUsers();
      const roleMapNew = new Map<string, UserRole>();
      for (const u of refreshed) roleMapNew.set(u.principal.toString(), u.role);
      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          role: roleMapNew.get(u.principal.toString()) ?? u.role,
        })),
      );
    } catch {
      toast.error("Action failed");
    } finally {
      setPendingAction(null);
    }
  }

  // Give RevBucks — calls adminUpdateUserLocation to persist changes on-chain immediately.
  async function handleAddRb(user: MergedUser) {
    if (!actor) return;
    const amtStr = rbInputs[user.principal.toString()] ?? "";
    const amt = Number.parseInt(amtStr, 10);
    if (Number.isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid positive number");
      return;
    }

    const currentMeta = decodeMetaFromLocation(user.locationRaw);
    const newMeta = { ...currentMeta, rb: currentMeta.rb + amt };
    const newEncoded = encodeMetaToLocation(newMeta);

    // Clear input
    setRbInputs((prev) => ({ ...prev, [user.principal.toString()]: "" }));

    const rbKey = `rb-${user.principal.toString()}`;
    setPendingAction(rbKey);
    try {
      await actor.adminUpdateUserLocation(user.principal, newEncoded);
      setUsers((prev) =>
        prev.map((u) =>
          u.principal.toString() === user.principal.toString()
            ? { ...u, revBucks: newMeta.rb, locationRaw: newEncoded }
            : u,
        ),
      );
      toast.success(
        `+${amt} RB added to ${user.displayName}! New balance: ${newMeta.rb} RB`,
      );
    } catch {
      toast.error("Failed to update RevBucks");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleProToggle(user: MergedUser) {
    if (!actor) return;
    const currentMeta = decodeMetaFromLocation(user.locationRaw);
    const newMeta = { ...currentMeta, isPro: !currentMeta.isPro };
    const newEncoded = encodeMetaToLocation(newMeta);

    const proKey = `pro-${user.principal.toString()}`;
    setPendingAction(proKey);
    try {
      await actor.adminUpdateUserLocation(user.principal, newEncoded);
      setUsers((prev) =>
        prev.map((u) =>
          u.principal.toString() === user.principal.toString()
            ? { ...u, isPro: newMeta.isPro, locationRaw: newEncoded }
            : u,
        ),
      );
      toast.success(
        `${user.displayName} Pro ${newMeta.isPro ? "enabled" : "removed"}`,
      );
    } catch {
      toast.error("Failed to update Pro status");
    } finally {
      setPendingAction(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 mt-4" data-ocid="admin.users.loading_state">
        {["u1", "u2", "u3", "u4"].map((k) => (
          <RowSkeleton key={k} />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center"
        data-ocid="admin.users.empty_state"
      >
        <Users
          size={40}
          className="mb-3"
          style={{ color: "oklch(var(--steel))" }}
        />
        <p className="text-muted-foreground">No users found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-4">
      <p className="text-xs text-muted-foreground mb-3">
        {users.length} user{users.length !== 1 ? "s" : ""} with profiles
      </p>
      {users.map((user, index) => {
        const isMe = user.principal.toString() === myPrincipal;
        const isBanned = user.role === "guest";
        const delKey = `del-${user.principal.toString()}`;
        const banKey = `ban-${user.principal.toString()}`;
        const principalStr = user.principal.toString();
        const rbInput = rbInputs[principalStr] ?? "";

        return (
          <div
            key={principalStr}
            className="rounded-xl transition-colors"
            data-ocid={`admin.users.item.${index + 1}`}
            style={{
              background: isBanned
                ? "oklch(var(--ember) / 0.06)"
                : "oklch(var(--surface))",
              border: isBanned
                ? "1px solid oklch(var(--ember) / 0.3)"
                : "1px solid oklch(var(--border))",
            }}
          >
            {/* Top row: avatar + name + badges */}
            <div className="flex items-center gap-3 p-3">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback
                  className="text-xs font-bold"
                  style={{
                    background: "oklch(var(--surface-elevated))",
                    color: "oklch(var(--orange-bright))",
                  }}
                >
                  {user.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">
                    {user.displayName}
                  </span>
                  <RoleBadge role={user.role} />
                  {user.isPro && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        background: "oklch(0.8 0.18 85 / 0.15)",
                        color: "oklch(0.82 0.18 85)",
                        border: "1px solid oklch(0.8 0.18 85 / 0.35)",
                      }}
                    >
                      <Crown size={9} />
                      Pro
                    </span>
                  )}
                  {user.isModel && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        background: "oklch(0.55 0.18 300 / 0.15)",
                        color: "oklch(0.78 0.18 300)",
                        border: "1px solid oklch(0.55 0.18 300 / 0.35)",
                      }}
                    >
                      Model
                    </span>
                  )}
                  {isMe && (
                    <span className="text-[10px] text-muted-foreground">
                      (you)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {/* Principal */}
                  <button
                    type="button"
                    className="text-[11px] font-mono flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ color: "oklch(var(--steel))" }}
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(principalStr)
                        .then(() => toast.success("Principal copied!"));
                    }}
                    title="Click to copy full principal"
                    data-ocid={`admin.users.button.${index + 1}`}
                  >
                    {truncPrincipal(user.principal)}
                    <Copy size={9} />
                  </button>

                  {/* RevBucks balance */}
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold"
                    style={{ color: "oklch(var(--orange-bright))" }}
                  >
                    <Zap size={10} />
                    {user.revBucks} RB
                  </span>
                </div>
              </div>

              {/* Desktop: ban/delete on the right */}
              {!isMe && (
                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs"
                    disabled={pendingAction === banKey}
                    onClick={() => handleBanToggle(user)}
                    data-ocid={
                      isBanned
                        ? `admin.users.secondary_button.${index + 1}`
                        : `admin.users.delete_button.${index + 1}`
                    }
                    style={
                      isBanned
                        ? {
                            borderColor: "oklch(0.7 0.18 150 / 0.5)",
                            color: "oklch(0.75 0.18 150)",
                          }
                        : {
                            borderColor: "oklch(var(--ember) / 0.5)",
                            color: "oklch(0.75 0.18 27)",
                          }
                    }
                  >
                    {pendingAction === banKey ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isBanned ? (
                      <>
                        <CheckCircle2 size={12} className="mr-1" />
                        Unban
                      </>
                    ) : (
                      <>
                        <UserX size={12} className="mr-1" />
                        Ban
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 px-2.5 text-xs"
                    disabled={pendingAction === delKey}
                    onClick={() => handleDeleteProfile(user.principal)}
                    data-ocid={`admin.users.delete_button.${index + 1}`}
                  >
                    {pendingAction === delKey ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <>
                        <Trash2 size={12} className="mr-1" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Bottom row: RevBucks + Pro controls */}
            <div
              className="px-3 pb-3 flex flex-wrap items-center gap-2"
              style={{ borderTop: "1px solid oklch(var(--border) / 0.5)" }}
            >
              {/* Add RevBucks */}
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  placeholder="RB amount"
                  value={rbInput}
                  onChange={(e) =>
                    setRbInputs((prev) => ({
                      ...prev,
                      [principalStr]: e.target.value,
                    }))
                  }
                  className="h-7 w-24 text-xs px-2 font-mono"
                  style={{
                    background: "oklch(var(--carbon))",
                    border: "1px solid oklch(var(--border))",
                  }}
                  data-ocid={`admin.users.input.${index + 1}`}
                />
                <Button
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1 font-bold"
                  onClick={() => {
                    void handleAddRb(user);
                  }}
                  disabled={pendingAction === `rb-${principalStr}`}
                  data-ocid={`admin.users.save_button.${index + 1}`}
                  style={{
                    background: "oklch(var(--orange) / 0.2)",
                    border: "1px solid oklch(var(--orange) / 0.4)",
                    color: "oklch(var(--orange-bright))",
                  }}
                >
                  {pendingAction === `rb-${principalStr}` ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <>
                      <Plus size={11} />
                      <Zap size={11} />
                    </>
                  )}
                  Add RB
                </Button>
              </div>

              {/* Pro toggle */}
              <Button
                size="sm"
                className="h-7 px-2.5 text-xs gap-1 font-bold"
                onClick={() => {
                  void handleProToggle(user);
                }}
                disabled={pendingAction === `pro-${principalStr}`}
                data-ocid={`admin.users.toggle.${index + 1}`}
                style={
                  user.isPro
                    ? {
                        background: "oklch(0.8 0.18 85 / 0.2)",
                        border: "1px solid oklch(0.8 0.18 85 / 0.4)",
                        color: "oklch(0.82 0.18 85)",
                      }
                    : {
                        background: "oklch(var(--surface-elevated))",
                        border: "1px solid oklch(var(--border))",
                        color: "oklch(var(--steel-light))",
                      }
                }
              >
                {pendingAction === `pro-${principalStr}` ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Crown size={11} />
                )}
                {user.isPro ? "Remove Pro" : "Give Pro"}
              </Button>

              {/* Mobile: ban/delete */}
              {!isMe && (
                <div className="flex sm:hidden items-center gap-1.5 ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs"
                    disabled={pendingAction === banKey}
                    onClick={() => handleBanToggle(user)}
                    style={
                      isBanned
                        ? {
                            borderColor: "oklch(0.7 0.18 150 / 0.5)",
                            color: "oklch(0.75 0.18 150)",
                          }
                        : {
                            borderColor: "oklch(var(--ember) / 0.5)",
                            color: "oklch(0.75 0.18 27)",
                          }
                    }
                  >
                    {pendingAction === banKey ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isBanned ? (
                      <>
                        <CheckCircle2 size={12} className="mr-1" />
                        Unban
                      </>
                    ) : (
                      <>
                        <UserX size={12} className="mr-1" />
                        Ban
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 px-2.5 text-xs"
                    disabled={pendingAction === delKey}
                    onClick={() => handleDeleteProfile(user.principal)}
                  >
                    {pendingAction === delKey ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <>
                        <Trash2 size={12} className="mr-1" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Posts tab ─────────────────────────────────────────────────────────────────

function PostsTab({ actor }: { actor: ReturnType<typeof useActor>["actor"] }) {
  const [posts, setPosts] = useState<PostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!actor) return;
    setLoading(true);
    actor
      .getAllPosts()
      .then((p: PostView[]) => {
        // Sort newest first
        const sorted = [...p].sort((a, b) => Number(b.timestamp - a.timestamp));
        setPosts(sorted);
      })
      .catch(() => toast.error("Failed to load posts"))
      .finally(() => setLoading(false));
  }, [actor]);

  async function handleDelete(postId: string) {
    if (!actor) return;
    setPendingId(postId);
    try {
      await actor.adminDeletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setConfirmId(null);
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete post");
    } finally {
      setPendingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 mt-4">
        {["p1", "p2", "p3", "p4"].map((k) => (
          <RowSkeleton key={k} />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Tag
          size={40}
          className="mb-3"
          style={{ color: "oklch(var(--steel))" }}
        />
        <p className="text-muted-foreground">No posts found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className="flex items-start gap-3 p-3 rounded-lg"
          style={{
            background: "oklch(var(--surface))",
            border: "1px solid oklch(var(--border))",
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 capitalize"
                style={{
                  borderColor:
                    post.postType === "reel"
                      ? "oklch(var(--orange) / 0.5)"
                      : "oklch(var(--border))",
                  color:
                    post.postType === "reel"
                      ? "oklch(var(--orange-bright))"
                      : "oklch(var(--steel-light))",
                }}
              >
                {post.postType}
              </Badge>
              {post.topic && (
                <span className="badge-orange text-[10px]">{post.topic}</span>
              )}
              <span
                className="text-[11px] ml-auto"
                style={{ color: "oklch(var(--steel))" }}
              >
                {formatTs(post.timestamp)}
              </span>
            </div>

            <p className="text-sm text-foreground line-clamp-2 mb-1">
              {post.content.slice(0, 120) || (
                <em className="text-muted-foreground">No caption</em>
              )}
            </p>

            <p
              className="text-[11px] font-mono"
              style={{ color: "oklch(var(--steel))" }}
            >
              by {truncPrincipal(post.author)} · {post.likes.length} likes ·{" "}
              {post.comments.length} comments
            </p>
          </div>

          <div className="flex-shrink-0">
            {confirmId === post.id ? (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 px-2.5 text-xs"
                  disabled={pendingId === post.id}
                  onClick={() => handleDelete(post.id)}
                >
                  {pendingId === post.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    "Confirm"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setConfirmId(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setConfirmId(post.id)}
                style={{ color: "oklch(var(--ember))" }}
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Marketplace tab ───────────────────────────────────────────────────────────

function MarketplaceTab({
  actor,
}: { actor: ReturnType<typeof useActor>["actor"] }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!actor) return;
    setLoading(true);
    actor
      .listAllListings()
      .then((l: Listing[]) => setListings(l))
      .catch(() => toast.error("Failed to load listings"))
      .finally(() => setLoading(false));
  }, [actor]);

  async function handleDelete(listingId: string) {
    if (!actor) return;
    setPendingId(listingId);
    try {
      await actor.adminDeleteListing(listingId);
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      setConfirmId(null);
      toast.success("Listing deleted");
    } catch {
      toast.error("Failed to delete listing");
    } finally {
      setPendingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 mt-4">
        {["m1", "m2", "m3", "m4"].map((k) => (
          <RowSkeleton key={k} />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package
          size={40}
          className="mb-3"
          style={{ color: "oklch(var(--steel))" }}
        />
        <p className="text-muted-foreground">No listings found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-4">
      {listings.map((listing) => (
        <div
          key={listing.id}
          className="flex items-start gap-3 p-3 rounded-lg"
          style={{
            background: "oklch(var(--surface))",
            border: "1px solid oklch(var(--border))",
          }}
        >
          {listing.imageUrls[0] && (
            <img
              src={listing.imageUrls[0]}
              alt={listing.title}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              style={{ border: "1px solid oklch(var(--border))" }}
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-semibold text-foreground truncate">
                {listing.title}
              </span>
              <span
                className="text-xs font-bold ml-auto"
                style={{ color: "oklch(var(--orange-bright))" }}
              >
                ${Number(listing.price).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 capitalize"
              >
                {listing.category}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 capitalize"
                style={{
                  borderColor: listing.isSold
                    ? "oklch(var(--steel) / 0.4)"
                    : "oklch(0.6 0.18 150 / 0.5)",
                  color: listing.isSold
                    ? "oklch(var(--steel))"
                    : "oklch(0.72 0.18 150)",
                }}
              >
                {listing.isSold ? "Sold" : listing.condition}
              </Badge>
            </div>

            <p
              className="text-[11px] font-mono mt-1"
              style={{ color: "oklch(var(--steel))" }}
            >
              seller: {truncPrincipal(listing.seller)}
            </p>
          </div>

          <div className="flex-shrink-0">
            {confirmId === listing.id ? (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 px-2.5 text-xs"
                  disabled={pendingId === listing.id}
                  onClick={() => handleDelete(listing.id)}
                >
                  {pendingId === listing.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    "Confirm"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setConfirmId(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setConfirmId(listing.id)}
                style={{ color: "oklch(var(--ember))" }}
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── AdminTokenGate ────────────────────────────────────────────────────────────

interface AdminTokenGateProps {
  actor: ReturnType<typeof useActor>["actor"];
  onSuccess: () => void;
}

function AdminTokenGate({ actor, onSuccess }: AdminTokenGateProps) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleClaim() {
    if (!token.trim()) return;
    setIsPending(true);
    setError("");

    const entered = token.trim();

    // Hardcoded password check — always works regardless of backend state
    if (entered === "Meonly123$") {
      localStorage.setItem("rs_admin_unlocked", "Meonly123$");
      toast.success("Admin access granted!");
      setIsPending(false);
      onSuccess();
      return;
    }

    // Fallback: try the backend token if actor is available
    if (!actor) {
      setError("Incorrect token. Try again.");
      setIsPending(false);
      return;
    }

    try {
      const actorWithInit = actor as typeof actor & {
        _initializeAccessControlWithSecret(secret: string): Promise<void>;
      };
      await actorWithInit._initializeAccessControlWithSecret(entered);
      const isNowAdmin = await actor.isCallerAdmin();
      if (isNowAdmin) {
        localStorage.setItem("rs_admin_unlocked", "Meonly123$");
        toast.success("Admin access granted!");
        onSuccess();
      } else {
        setError("Incorrect token. Try again.");
      }
    } catch {
      setError("Incorrect token. Try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div
        className="w-full max-w-sm rounded-2xl p-8 space-y-6"
        style={{
          background: "oklch(var(--surface))",
          border: "1px solid oklch(0.55 0.22 75 / 0.3)",
          boxShadow: "0 0 40px oklch(0.55 0.22 75 / 0.08)",
        }}
      >
        {/* Icon + title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "oklch(0.55 0.22 75 / 0.15)",
              border: "1px solid oklch(0.55 0.22 75 / 0.3)",
            }}
          >
            <KeyRound size={26} style={{ color: "oklch(0.8 0.22 75)" }} />
          </div>
          <div>
            <h2
              className="text-xl font-black uppercase tracking-wide"
              style={{ color: "oklch(0.9 0.05 75)" }}
            >
              Admin Access
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your admin token to unlock the panel
            </p>
          </div>
        </div>

        {/* Token input */}
        <div className="space-y-2">
          <div className="relative">
            <Input
              type={showToken ? "text" : "password"}
              placeholder="Enter admin token…"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleClaim()}
              className="pr-10 text-sm font-mono"
              style={{
                background: "oklch(var(--carbon))",
                border: error
                  ? "1px solid oklch(var(--ember))"
                  : "1px solid oklch(var(--border))",
                color: "oklch(var(--foreground))",
              }}
              data-ocid="admin.input"
              autoFocus
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? "Hide token" : "Show token"}
            >
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && (
            <p
              className="text-xs font-medium"
              style={{ color: "oklch(var(--ember))" }}
              data-ocid="admin.error_state"
            >
              {error}
            </p>
          )}
        </div>

        {/* Submit */}
        <Button
          type="button"
          className="w-full font-bold text-sm"
          disabled={!token.trim() || isPending}
          onClick={handleClaim}
          style={{
            background: "oklch(0.55 0.22 75)",
            color: "oklch(0.1 0 0)",
          }}
          data-ocid="admin.submit_button"
        >
          {isPending ? (
            <Loader2 size={16} className="animate-spin mr-2" />
          ) : (
            <ShieldCheck size={16} className="mr-2" />
          )}
          {isPending ? "Verifying…" : "Unlock Admin Panel"}
        </Button>
      </div>
    </div>
  );
}

// ── AdminPage ─────────────────────────────────────────────────────────────────

export function AdminPage() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);
  const [listingCount, setListingCount] = useState<number | null>(null);

  const myPrincipal = identity?.getPrincipal().toString();

  // Safety timeout — if isAdmin is still null after 5s, fall through to token gate
  useEffect(() => {
    const t = setTimeout(() => {
      setIsAdmin((prev) => {
        if (prev === null) return false;
        return prev;
      });
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  // Auth check — also honour the local password unlock
  useEffect(() => {
    if (isFetching) return;
    // If the user already unlocked with the hardcoded password, skip backend check
    if (localStorage.getItem("rs_admin_unlocked") === "Meonly123$") {
      setIsAdmin(true);
      return;
    }
    if (!actor) {
      setIsAdmin(false);
      return;
    }
    actor
      .isCallerAdmin()
      .then((result: boolean) => {
        setIsAdmin(result);
      })
      .catch(() => {
        setIsAdmin(false);
      });
  }, [actor, isFetching]);

  // Count badges (best-effort) — use adminGetAllProfiles for accurate user count
  useEffect(() => {
    if (!actor || !isAdmin) return;
    Promise.all([
      actor
        .adminGetAllProfiles()
        .then((p: ProfileWithPrincipal[]) => setUserCount(p.length)),
      actor.getAllPosts().then((p: PostView[]) => setPostCount(p.length)),
      actor.listAllListings().then((l: Listing[]) => setListingCount(l.length)),
    ]).catch(() => {});
  }, [actor, isAdmin]);

  // Loading state
  if (isAdmin === null || isFetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(var(--orange) / 0.15)" }}
          >
            <ShieldCheck size={24} style={{ color: "oklch(var(--orange))" }} />
          </div>
          <p className="text-sm text-muted-foreground">
            Verifying admin access…
          </p>
        </div>
      </div>
    );
  }

  // Not yet admin — show token claim form
  if (!isAdmin) {
    return <AdminTokenGate actor={actor} onSuccess={() => setIsAdmin(true)} />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "oklch(0.55 0.22 75 / 0.15)",
            border: "1px solid oklch(0.55 0.22 75 / 0.3)",
          }}
        >
          <ShieldCheck size={20} style={{ color: "oklch(0.8 0.22 75)" }} />
        </div>
        <div>
          <h1
            className="text-2xl font-black uppercase tracking-wide"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Admin Panel
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage users, content, and marketplace listings
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <AlertTriangle size={14} style={{ color: "oklch(var(--ember))" }} />
          <span
            className="text-xs font-medium"
            style={{ color: "oklch(var(--ember))" }}
          >
            Destructive actions are permanent
          </span>
        </div>
      </div>

      {/* Creator Invite Link */}
      <Card
        className="mb-4 border-0"
        style={{
          background: "oklch(var(--surface))",
          border: "1px solid oklch(0.45 0.15 290 / 0.4)",
        }}
      >
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "oklch(0.45 0.15 290 / 0.15)",
                border: "1px solid oklch(0.45 0.15 290 / 0.35)",
              }}
            >
              <Link2 size={14} style={{ color: "oklch(0.72 0.18 290)" }} />
            </div>
            <span style={{ color: "oklch(0.72 0.18 290)" }}>
              Creator Invite Link
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Share this link with your friends. Anyone who opens it will get the{" "}
            <span
              className="font-semibold"
              style={{ color: "oklch(0.72 0.18 290)" }}
            >
              Friends with Creator
            </span>{" "}
            ✨ badge on their profile.
          </p>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 rounded-lg px-3 py-2 text-xs font-mono truncate select-all"
              style={{
                background: "oklch(var(--carbon))",
                border: "1px solid oklch(var(--border))",
                color: "oklch(0.75 0.05 290)",
              }}
            >
              https://revspace-2ah.caffeine.xyz/?ref=FRIENDOFCREATOR
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0 gap-1.5 text-xs font-bold"
              style={{
                background: "oklch(0.45 0.15 290 / 0.2)",
                border: "1px solid oklch(0.45 0.15 290 / 0.5)",
                color: "oklch(0.72 0.18 290)",
              }}
              onClick={() => {
                void navigator.clipboard
                  .writeText(
                    "https://revspace-2ah.caffeine.xyz/?ref=FRIENDOFCREATOR",
                  )
                  .then(() => toast.success("Link copied!"));
              }}
            >
              <Copy size={12} />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card
        className="border-0"
        style={{
          background: "oklch(var(--surface))",
          border: "1px solid oklch(var(--border))",
        }}
      >
        <CardContent className="p-0">
          <Tabs defaultValue="users">
            <div
              className="px-4 pt-4"
              style={{ borderBottom: "1px solid oklch(var(--border))" }}
            >
              <TabsList
                className="h-9 gap-1 p-0.5"
                style={{
                  background: "oklch(var(--carbon))",
                  border: "1px solid oklch(var(--border))",
                }}
              >
                <TabsTrigger value="users" className="h-8 text-xs px-3 gap-1.5">
                  <Users size={13} />
                  Users
                  {userCount !== null && (
                    <span
                      className="px-1.5 py-0 rounded-full text-[10px] font-bold"
                      style={{
                        background: "oklch(var(--orange) / 0.2)",
                        color: "oklch(var(--orange-bright))",
                      }}
                    >
                      {userCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="posts" className="h-8 text-xs px-3 gap-1.5">
                  <Tag size={13} />
                  Posts
                  {postCount !== null && (
                    <span
                      className="px-1.5 py-0 rounded-full text-[10px] font-bold"
                      style={{
                        background: "oklch(var(--orange) / 0.2)",
                        color: "oklch(var(--orange-bright))",
                      }}
                    >
                      {postCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="marketplace"
                  className="h-8 text-xs px-3 gap-1.5"
                >
                  <Package size={13} />
                  Market
                  {listingCount !== null && (
                    <span
                      className="px-1.5 py-0 rounded-full text-[10px] font-bold"
                      style={{
                        background: "oklch(var(--orange) / 0.2)",
                        color: "oklch(var(--orange-bright))",
                      }}
                    >
                      {listingCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="px-4 pb-4">
              <TabsContent value="users" className="mt-0">
                <UsersTab actor={actor} myPrincipal={myPrincipal} />
              </TabsContent>
              <TabsContent value="posts" className="mt-0">
                <PostsTab actor={actor} />
              </TabsContent>
              <TabsContent value="marketplace" className="mt-0">
                <MarketplaceTab actor={actor} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
