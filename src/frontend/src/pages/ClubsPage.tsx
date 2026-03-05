import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Link, Loader2, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ClubView } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAllClubs,
  useCreateClub,
  useGetProfile,
  useJoinClub,
  useLeaveClub,
} from "../hooks/useQueries";
import { clearUserClub, setUserClub } from "../lib/customizations";
import { truncatePrincipal } from "../utils/format";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Principal } from "@icp-sdk/core/principal";

// ─── ClubMemberRow ────────────────────────────────────────────────────────────
function ClubMemberRow({
  member,
  clubName,
}: { member: Principal; clubName: string }) {
  const { data: profile } = useGetProfile(member);
  const displayName =
    profile?.displayName ?? truncatePrincipal(member.toString());
  const avatarUrl = profile?.avatarUrl ?? "";

  return (
    <div className="flex items-center gap-2 py-1.5">
      <Avatar className="w-7 h-7 shrink-0">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
        <AvatarFallback
          className="text-[10px]"
          style={{ background: "oklch(var(--surface-elevated))" }}
        >
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-semibold text-foreground truncate">
          {displayName}
        </span>
        <span
          className="inline-flex items-center gap-0.5 font-bold italic tracking-widest uppercase leading-none"
          style={{
            fontSize: "8px",
            background:
              "linear-gradient(90deg, oklch(0.7 0.18 45), oklch(0.75 0.2 50))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          <span style={{ WebkitTextFillColor: "oklch(0.7 0.18 45)" }}>⚡</span>
          {clubName}
        </span>
      </div>
    </div>
  );
}

const CLUB_CATEGORIES = [
  "JDM",
  "European",
  "American",
  "NA",
  "Turbocharged",
  "Stance",
  "Lifestyle",
  "Track",
  "Off-Road",
];

function ClubDetailModal({
  club,
  open,
  onClose,
}: { club: ClubView; open: boolean; onClose: () => void }) {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const isMember = myPrincipal
    ? club.members.some((m) => m.toString() === myPrincipal)
    : false;
  const joinClub = useJoinClub();
  const leaveClub = useLeaveClub();

  const handleToggleMembership = () => {
    if (!myPrincipal) {
      toast.error("Sign in to join clubs");
      return;
    }
    if (isMember) {
      leaveClub.mutate(club.id, {
        onSuccess: () => {
          clearUserClub(myPrincipal);
          toast.success(`Left ${club.name}`);
        },
        onError: () => toast.error("Failed"),
      });
    } else {
      joinClub.mutate(club.id, {
        onSuccess: () => {
          setUserClub(myPrincipal, club.name);
          toast.success(`Joined ${club.name}! 🎉`);
        },
        onError: () => toast.error("Failed"),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md w-full"
        style={{
          background: "oklch(var(--surface))",
          border: "1px solid oklch(var(--border))",
        }}
      >
        <div className="relative overflow-hidden rounded-lg">
          <img
            src={
              club.coverImageUrl ||
              `https://picsum.photos/seed/${club.id}/800/400`
            }
            alt={club.name}
            className="w-full h-40 object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, oklch(0 0 0 / 0.7) 0%, transparent 60%)",
            }}
          />
          <div className="absolute bottom-3 left-4">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: "oklch(var(--orange))",
                color: "oklch(var(--carbon))",
              }}
            >
              {club.category}
            </span>
          </div>
        </div>

        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {club.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-steel">
              <Users size={14} className="text-orange" />
              <span>{club.members.length} members</span>
            </div>
            <button
              type="button"
              data-ocid="club_detail.invite.button"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors"
              style={{
                background: "oklch(var(--surface-elevated))",
                border: "1px solid oklch(var(--border))",
                color: "oklch(var(--foreground))",
              }}
              onClick={() => {
                const url = `${window.location.origin}/?joinClub=${club.id}`;
                navigator.clipboard
                  .writeText(url)
                  .then(() => {
                    toast.success("Invite link copied!");
                  })
                  .catch(() => {
                    toast.error("Could not copy link");
                  });
              }}
            >
              <Link size={12} />
              Copy Invite Link
            </button>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {club.description}
          </p>

          {/* Members list with club tags */}
          {club.members.length > 0 && (
            <div
              className="rounded-xl p-3 max-h-40 overflow-y-auto"
              style={{
                background: "oklch(var(--surface-elevated))",
                border: "1px solid oklch(var(--border))",
              }}
            >
              <p className="text-[10px] font-semibold text-steel uppercase tracking-wider mb-2">
                Members
              </p>
              <div className="divide-y divide-border/40">
                {club.members.slice(0, 20).map((m) => (
                  <ClubMemberRow
                    key={m.toString()}
                    member={m}
                    clubName={club.name}
                  />
                ))}
                {club.members.length > 20 && (
                  <p className="text-[10px] text-steel pt-1.5">
                    +{club.members.length - 20} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={handleToggleMembership}
          disabled={joinClub.isPending || leaveClub.isPending}
          className="w-full"
          style={
            isMember
              ? {
                  background: "oklch(var(--surface-elevated))",
                  color: "oklch(var(--foreground))",
                  border: "1px solid oklch(var(--border))",
                }
              : {
                  background: "oklch(var(--orange))",
                  color: "oklch(var(--carbon))",
                }
          }
        >
          {joinClub.isPending || leaveClub.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : isMember ? (
            "Leave Club"
          ) : (
            "Join Club 🔥"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function CreateClubModal({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "JDM",
    coverImageUrl: "",
  });
  const createClub = useCreateClub();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createClub.mutate(form, {
      onSuccess: () => {
        toast.success("Club created!");
        onClose();
        setForm({
          name: "",
          description: "",
          category: "JDM",
          coverImageUrl: "",
        });
      },
      onError: () => toast.error("Failed to create club"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md w-full"
        style={{
          background: "oklch(var(--surface))",
          border: "1px solid oklch(var(--border))",
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Create Club
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs text-steel mb-1 block">Club Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="JDM Underground"
              required
              style={{
                background: "oklch(var(--surface-elevated))",
                borderColor: "oklch(var(--border))",
              }}
            />
          </div>

          <div>
            <Label className="text-xs text-steel mb-1 block">Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
            >
              <SelectTrigger
                style={{
                  background: "oklch(var(--surface-elevated))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "oklch(var(--surface))" }}>
                {CLUB_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-steel mb-1 block">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="What is your club about?"
              className="min-h-[80px] resize-none text-sm"
              style={{
                background: "oklch(var(--surface-elevated))",
                borderColor: "oklch(var(--border))",
              }}
            />
          </div>

          <div>
            <Label className="text-xs text-steel mb-1 block">
              Cover Image URL
            </Label>
            <Input
              value={form.coverImageUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, coverImageUrl: e.target.value }))
              }
              placeholder="https://..."
              type="url"
              style={{
                background: "oklch(var(--surface-elevated))",
                borderColor: "oklch(var(--border))",
              }}
            />
          </div>

          <Button
            type="submit"
            disabled={createClub.isPending || !form.name}
            className="w-full"
            style={{
              background: "oklch(var(--orange))",
              color: "oklch(var(--carbon))",
            }}
          >
            {createClub.isPending ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Club"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ClubsPage() {
  const [selectedClub, setSelectedClub] = useState<ClubView | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: clubs, isLoading } = useAllClubs();
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();

  const displayClubs = clubs ?? [];

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <h1 className="font-display text-2xl font-bold">Car Clubs</h1>
        <Button
          type="button"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          style={{
            background: "oklch(var(--orange))",
            color: "oklch(var(--carbon))",
          }}
        >
          <Plus size={14} className="mr-1" />
          Create
        </Button>
      </header>

      <div className="p-4 grid grid-cols-1 gap-4">
        {isLoading ? (
          ["c1", "c2", "c3"].map((k) => (
            <Skeleton key={k} className="h-52 rounded-xl" />
          ))
        ) : displayClubs.length === 0 ? (
          <div className="text-center py-16">
            <Users size={32} className="mx-auto mb-3 text-steel" />
            <p className="text-steel text-sm">No clubs yet</p>
          </div>
        ) : (
          displayClubs.map((club) => {
            const isMember = myPrincipal
              ? club.members.some((m) => m.toString() === myPrincipal)
              : false;

            return (
              <button
                key={club.id}
                type="button"
                className="relative overflow-hidden rounded-xl cursor-pointer group text-left w-full"
                style={{
                  border: "1px solid oklch(var(--border))",
                  background: "oklch(var(--surface))",
                }}
                onClick={() => setSelectedClub(club)}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={
                      club.coverImageUrl ||
                      `https://picsum.photos/seed/${club.id}/800/400`
                    }
                    alt={club.name}
                    className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, oklch(0 0 0 / 0.8) 0%, transparent 40%)",
                    }}
                  />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <div>
                      <p className="text-white font-display text-xl font-bold">
                        {club.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: "oklch(var(--orange))",
                            color: "oklch(var(--carbon))",
                          }}
                        >
                          {club.category}
                        </span>
                        <span className="text-white/70 text-[10px] flex items-center gap-1">
                          <Users size={9} />
                          {club.members.length}
                        </span>
                      </div>
                    </div>
                    {isMember && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          background: "oklch(var(--orange) / 0.2)",
                          color: "oklch(var(--orange-bright))",
                          border: "1px solid oklch(var(--orange) / 0.3)",
                        }}
                      >
                        Member
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-steel line-clamp-2">
                    {club.description}
                  </p>
                </div>
              </button>
            );
          })
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

      {selectedClub && (
        <ClubDetailModal
          club={selectedClub}
          open={!!selectedClub}
          onClose={() => setSelectedClub(null)}
        />
      )}
      <CreateClubModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
