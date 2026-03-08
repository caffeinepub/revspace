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
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { backendInterface } from "../backend";
import type { Listing, PostView, Profile, UserRole } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useAdminActor } from "../hooks/useAdminActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { usePublicActor } from "../hooks/usePublicActor";
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

// Wrap a promise with a timeout so slow/missing backend calls don't hang forever
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms),
    ),
  ]);
}

function UsersTab({
  actor,
  writeActor,
  fallbackActor,
  myPrincipal,
}: {
  actor: backendInterface | null; // public actor for reads (also used for adminGetAllProfilesPublic)
  writeActor: backendInterface | null; // adminActor for role-gated writes (ban/delete)
  fallbackActor: backendInterface | null; // regular auth actor for secret-based writes
  myPrincipal: string | undefined;
}) {
  const [users, setUsers] = useState<MergedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorMsg, setLoadErrorMsg] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  // Per-user RB input values
  const [rbInputs, setRbInputs] = useState<Record<string, string>>({});

  const loadUsers = useCallback(async () => {
    if (!actor) {
      // Actor not ready yet — will retry via useEffect when it becomes available
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    setLoadErrorMsg("");

    try {
      const seen = new Set<string>();
      const merged: MergedUser[] = [];

      // Strategy 1: adminGetAllProfilesPublic — no role check needed, just the
      // secret token. Returns ALL registered users even if they have no posts.
      // Wrapped in a 10-second timeout so it fails fast if the function doesn't exist.
      try {
        const allProfiles = await withTimeout(
          actor.adminGetAllProfilesPublic("Meonly123$"),
          10000,
        );
        for (const pp of allProfiles) {
          const key = pp.principal.toString();
          if (!seen.has(key)) {
            seen.add(key);
            const meta = decodeMetaFromLocation(pp.profile.location ?? "");
            merged.push({
              principal: pp.principal,
              role: "user" as UserRole,
              displayName:
                pp.profile.displayName || truncPrincipal(pp.principal),
              avatarUrl: pp.profile.avatarUrl || "",
              revBucks: meta.rb,
              isPro: meta.isPro,
              isModel: meta.isModel,
              locationRaw: pp.profile.location ?? "",
            });
          }
        }
      } catch (e) {
        console.warn("[Admin] adminGetAllProfilesPublic failed:", e);
        // Fall through to Strategy 2 if the public admin call fails
      }

      // Strategy 2: getAllPosts() — catches any users who have posts but
      // somehow aren't in the profiles list (edge case). Always runs.
      const extraPrincipals: Principal[] = [];
      try {
        const posts = await withTimeout(actor.getAllPosts(), 10000);
        for (const p of posts) {
          const key = p.author.toString();
          if (!seen.has(key)) {
            seen.add(key);
            extraPrincipals.push(p.author);
          }
        }
      } catch (e) {
        console.warn("[Admin] getAllPosts failed:", e);
        // Posts call failed — OK if Strategy 1 already gave us users
      }

      // Fetch profiles for any additional principals found via posts
      if (extraPrincipals.length > 0) {
        const extraResults = await Promise.allSettled(
          extraPrincipals.map((pr) => actor.getProfile(pr)),
        );
        for (let i = 0; i < extraPrincipals.length; i++) {
          const result = extraResults[i];
          if (result.status === "rejected" || result.value === null) continue;
          const profile = result.value as Profile;
          const meta = decodeMetaFromLocation(profile.location ?? "");
          merged.push({
            principal: extraPrincipals[i],
            role: "user" as UserRole,
            displayName:
              profile.displayName || truncPrincipal(extraPrincipals[i]),
            avatarUrl: profile.avatarUrl || "",
            revBucks: meta.rb,
            isPro: meta.isPro,
            isModel: meta.isModel,
            locationRaw: profile.location ?? "",
          });
        }
      }

      if (merged.length === 0) {
        // Both strategies returned nothing — could be a real empty state or a failure
        setUsers([]);
        setLoading(false);
        return;
      }

      // Sort alphabetically by display name
      merged.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setUsers(merged);
      setLoadError(false);
      setLoadErrorMsg("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Admin] loadUsers error:", msg);
      toast.error("Failed to load users — tap Retry to try again");
      setLoadError(true);
      setLoadErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!actor) {
      // Actor not ready yet — schedule a retry in 2 seconds
      const timer = setTimeout(() => {
        if (actor) void loadUsers();
      }, 2000);
      return () => clearTimeout(timer);
    }
    void loadUsers();
  }, [actor, loadUsers]);

  async function handleDeleteProfile(principal: Principal) {
    // Destructive actions require the admin actor (needs #admin role)
    const actor = writeActor;
    if (!actor) {
      toast.error(
        writeActor === null && !fallbackActor
          ? "Not logged in — sign in with Internet Identity first"
          : "Admin session not ready yet — wait a moment and retry",
      );
      return;
    }
    const key = `del-${principal.toString()}`;
    setPendingAction(key);
    try {
      await actor.adminDeleteProfile(principal);
      setUsers((prev) =>
        prev.filter((u) => u.principal.toString() !== principal.toString()),
      );
      toast.success("Profile deleted");
    } catch {
      toast.error(
        "Failed to delete profile — admin session may still be initializing",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBanToggle(user: MergedUser) {
    // Ban/unban requires the admin actor (needs #admin role)
    const actor = writeActor;
    if (!actor) {
      toast.error(
        !fallbackActor
          ? "Not logged in — sign in with Internet Identity first"
          : "Admin session not ready yet — wait a moment and retry",
      );
      return;
    }
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
      toast.error("Action failed — admin session may still be initializing");
    } finally {
      setPendingAction(null);
    }
  }

  // Give RevBucks — uses adminSetUserMeta which authenticates via SECRET only
  // (no #admin role needed). Works with any authenticated actor (writeActor OR fallbackActor).
  async function handleAddRb(user: MergedUser) {
    // Use writeActor first, fall back to the regular auth actor.
    // adminSetUserMeta checks the secret directly, so no role is needed.
    const effectiveActor = writeActor ?? fallbackActor;
    if (!effectiveActor) {
      toast.error("Not logged in — sign in with Internet Identity first");
      return;
    }
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
      // adminSetUserMeta — authenticates via secret, no role check
      await effectiveActor.adminSetUserMeta(
        user.principal,
        newEncoded,
        "Meonly123$",
      );
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("handleAddRb failed:", msg);
      toast.error(`Failed to update RevBucks: ${msg.slice(0, 160)}`);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleProToggle(user: MergedUser) {
    // Use writeActor first, fall back to the regular auth actor.
    // adminSetUserMeta checks the secret directly, so no role is needed.
    const effectiveActor = writeActor ?? fallbackActor;
    if (!effectiveActor) {
      toast.error("Not logged in — sign in with Internet Identity first");
      return;
    }
    const currentMeta = decodeMetaFromLocation(user.locationRaw);
    const newMeta = { ...currentMeta, isPro: !currentMeta.isPro };
    const newEncoded = encodeMetaToLocation(newMeta);

    const proKey = `pro-${user.principal.toString()}`;
    setPendingAction(proKey);
    try {
      // adminSetUserMeta — authenticates via secret, no role check
      await effectiveActor.adminSetUserMeta(
        user.principal,
        newEncoded,
        "Meonly123$",
      );
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("handleProToggle failed:", msg);
      toast.error(`Failed to update Pro status: ${msg.slice(0, 160)}`);
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

  if (loadError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center gap-4"
        data-ocid="admin.users.error_state"
      >
        <Users
          size={40}
          className="mb-1"
          style={{ color: "oklch(var(--ember))" }}
        />
        <p className="text-sm text-muted-foreground">
          Could not load users. The canister may still be warming up.
        </p>
        {loadErrorMsg ? (
          <p className="text-xs font-mono text-muted-foreground mt-1 max-w-xs break-all">
            {loadErrorMsg.slice(0, 200)}
          </p>
        ) : null}
        <Button
          size="sm"
          onClick={() => void loadUsers()}
          data-ocid="admin.users.secondary_button"
          style={{
            background: "oklch(var(--orange) / 0.2)",
            border: "1px solid oklch(var(--orange) / 0.4)",
            color: "oklch(var(--orange-bright))",
          }}
        >
          Retry
        </Button>
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

function PostsTab({
  actor,
  writeActor,
}: { actor: backendInterface | null; writeActor: backendInterface | null }) {
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
    if (!writeActor) {
      toast.error("Not logged in — sign in with Internet Identity first");
      return;
    }
    setPendingId(postId);
    try {
      await writeActor.adminDeletePost(postId);
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
  writeActor,
}: { actor: backendInterface | null; writeActor: backendInterface | null }) {
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
    if (!writeActor) {
      toast.error("Not logged in — sign in with Internet Identity first");
      return;
    }
    setPendingId(listingId);
    try {
      await writeActor.adminDeleteListing(listingId);
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
  actor: backendInterface | null;
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

    if (entered !== "Meonly123$") {
      setError("Incorrect token. Try again.");
      setIsPending(false);
      return;
    }

    // Store in both localStorage (UI gate) and sessionStorage (actor hook reads this
    // as caffeineAdminToken to call _initializeAccessControlWithSecret with the real
    // token on the NEXT actor creation — before the caller is registered as a regular user).
    localStorage.setItem("rs_admin_unlocked", "Meonly123$");
    sessionStorage.setItem("caffeineAdminToken", "Meonly123$");

    // Try to immediately register this session as admin in the backend.
    // This only works if the canister hasn't yet registered this principal —
    // i.e., on a fresh canister cold start. On a warm canister the caller may
    // already be registered as #user, so the backend initialize() returns early.
    // The reload below ensures the actor is recreated with the token so that
    // on future cold starts the admin is registered first.
    if (actor) {
      try {
        // Cast to any: _initializeAccessControlWithSecret exists in the backend
        // but is not exposed in the generated backendInterface type definition.
        await (
          actor as unknown as {
            _initializeAccessControlWithSecret: (s: string) => Promise<void>;
          }
        )._initializeAccessControlWithSecret("Meonly123$");
      } catch {
        // ignore — may fail if already registered as user
      }
    }

    toast.success("Admin access granted!");
    setIsPending(false);
    onSuccess();
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
  // publicActor — anonymous, only for reads (getAllPosts, getProfile, listAllListings)
  const { actor } = usePublicActor();
  // adminActor — authenticated actor that passes the admin token to adminPromoteToAdmin
  // so the canister forcefully registers/promotes this principal as #admin.
  const { actor: adminActor, isReady: backendAdminReady } = useAdminActor();
  // regularActor — standard auth actor, always available when logged in.
  // Used as fallback for adminSetUserMeta which only needs the secret, not a role.
  const { actor: regularActor } = useActor();
  const { identity } = useInternetIdentity();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);
  const [listingCount, setListingCount] = useState<number | null>(null);

  const myPrincipal = identity?.getPrincipal().toString();

  // ── Check saved token immediately (no actor needed for UI gate) ──────────
  useEffect(() => {
    const savedToken = localStorage.getItem("rs_admin_unlocked");
    if (savedToken === "Meonly123$") {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, []);

  // Count badges — derive user count from unique post authors (public call)
  useEffect(() => {
    if (!actor || !isAdmin) return;
    Promise.allSettled([
      actor.getAllPosts().then((p: PostView[]) => {
        const unique = new Set(p.map((post) => post.author.toString()));
        setUserCount(unique.size);
        setPostCount(p.length);
      }),
      actor.listAllListings().then((l: Listing[]) => setListingCount(l.length)),
    ]).catch(() => {});
  }, [actor, isAdmin]);

  // Loading state — only block while isAdmin is still unknown (should be instant now)
  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(var(--orange) / 0.15)" }}
          >
            <ShieldCheck size={24} style={{ color: "oklch(var(--orange))" }} />
          </div>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  // Not yet admin — show token claim form
  if (!isAdmin) {
    return (
      <AdminTokenGate
        actor={actor}
        onSuccess={() => {
          setIsAdmin(true);
        }}
      />
    );
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
          {!backendAdminReady ? (
            <>
              <Loader2
                size={13}
                className="animate-spin"
                style={{ color: "oklch(var(--orange))" }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: "oklch(var(--orange))" }}
              >
                Connecting…
              </span>
            </>
          ) : (
            <>
              <AlertTriangle
                size={14}
                style={{ color: "oklch(var(--ember))" }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: "oklch(var(--ember))" }}
              >
                Destructive actions are permanent
              </span>
            </>
          )}
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
                <UsersTab
                  actor={actor}
                  writeActor={adminActor}
                  fallbackActor={regularActor}
                  myPrincipal={myPrincipal}
                />
              </TabsContent>
              <TabsContent value="posts" className="mt-0">
                <PostsTab actor={actor} writeActor={adminActor} />
              </TabsContent>
              <TabsContent value="marketplace" className="mt-0">
                <MarketplaceTab actor={actor} writeActor={adminActor} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
