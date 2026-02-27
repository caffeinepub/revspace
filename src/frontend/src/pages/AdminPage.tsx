import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Principal } from "@icp-sdk/core/principal";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Loader2,
  Package,
  ShieldCheck,
  Tag,
  Trash2,
  UserX,
  Users,
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

  useEffect(() => {
    if (!actor) return;
    setLoading(true);
    Promise.all([actor.adminGetAllUsers(), actor.adminGetAllProfiles()])
      .then(
        ([usersArr, profilesArr]: [UserWithRole[], ProfileWithPrincipal[]]) => {
          const profileMap = new Map<string, ProfileWithPrincipal["profile"]>();
          for (const pp of profilesArr) {
            profileMap.set(pp.principal.toString(), pp.profile);
          }
          const merged: MergedUser[] = usersArr.map((u) => {
            const p = profileMap.get(u.principal.toString());
            return {
              principal: u.principal,
              role: u.role,
              displayName: p?.displayName || truncPrincipal(u.principal),
              avatarUrl: p?.avatarUrl || "",
            };
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
      // refresh the role
      const refreshed = await actor.adminGetAllUsers();
      const roleMap = new Map<string, UserRole>();
      for (const u of refreshed) roleMap.set(u.principal.toString(), u.role);
      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          role: roleMap.get(u.principal.toString()) ?? u.role,
        })),
      );
    } catch {
      toast.error("Action failed");
    } finally {
      setPendingAction(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 mt-4">
        {["u1", "u2", "u3", "u4"].map((k) => (
          <RowSkeleton key={k} />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
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
      {users.map((user) => {
        const isMe = user.principal.toString() === myPrincipal;
        const isBanned = user.role === "guest";
        const delKey = `del-${user.principal.toString()}`;
        const banKey = `ban-${user.principal.toString()}`;

        return (
          <div
            key={user.principal.toString()}
            className="flex items-center gap-3 p-3 rounded-lg transition-colors"
            style={{
              background: isBanned
                ? "oklch(var(--ember) / 0.08)"
                : "oklch(var(--surface))",
              border: isBanned
                ? "1px solid oklch(var(--ember) / 0.3)"
                : "1px solid oklch(var(--border))",
            }}
          >
            <Avatar className="h-9 w-9 flex-shrink-0">
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
                <span className="text-sm font-semibold text-foreground truncate">
                  {user.displayName}
                </span>
                <RoleBadge role={user.role} />
                {isMe && (
                  <span className="text-[10px] text-muted-foreground">
                    (you)
                  </span>
                )}
              </div>
              <p
                className="text-xs mt-0.5 font-mono"
                style={{ color: "oklch(var(--steel))" }}
              >
                {truncPrincipal(user.principal)}
              </p>
            </div>

            {!isMe && (
              <div className="flex items-center gap-2 flex-shrink-0">
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

// ── AdminPage ─────────────────────────────────────────────────────────────────

export function AdminPage() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);
  const [listingCount, setListingCount] = useState<number | null>(null);

  const myPrincipal = identity?.getPrincipal().toString();

  // Auth check
  useEffect(() => {
    if (!actor || isFetching) return;
    actor
      .isCallerAdmin()
      .then((result: boolean) => {
        setIsAdmin(result);
        if (!result) {
          navigate({ to: "/" });
        }
      })
      .catch(() => {
        setIsAdmin(false);
        navigate({ to: "/" });
      });
  }, [actor, isFetching, navigate]);

  // Count badges (best-effort)
  useEffect(() => {
    if (!actor || !isAdmin) return;
    Promise.all([
      actor
        .adminGetAllUsers()
        .then((u: UserWithRole[]) => setUserCount(u.length)),
      actor.getAllPosts().then((p: PostView[]) => setPostCount(p.length)),
      actor.listAllListings().then((l: Listing[]) => setListingCount(l.length)),
    ]).catch(() => {});
  }, [actor, isAdmin]);

  // Loading / redirect states
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

  if (!isAdmin) return null;

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
