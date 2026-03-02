import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Principal } from "@icp-sdk/core/principal";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Car,
  Gift,
  Grid3X3,
  Info,
  Loader2,
  MapPin,
  MessageCircle,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FollowListModal } from "../components/FollowListModal";
import { FriendBadge } from "../components/FriendBadge";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useFollowUser,
  useGarageByUser,
  useGetFollowers,
  useGetFollowing,
  useGetPostsByUser,
  useGetProfile,
  useIsFollowing,
  useUnfollowUser,
} from "../hooks/useQueries";
import { getGiftSummary } from "../lib/revbucks";
import { getDisplayLocation } from "../lib/userMeta";
import { getInitials, truncatePrincipal } from "../utils/format";

interface UserProfilePageProps {
  userId: string;
}

export function UserProfilePage({ userId }: UserProfilePageProps) {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const myPrincipalStr = identity?.getPrincipal().toString() ?? "";

  // Parse the principal from the userId string
  let targetPrincipal: Principal | undefined;
  let parseError = false;
  try {
    targetPrincipal = Principal.fromText(userId);
  } catch {
    parseError = true;
  }

  const isOwnProfile = myPrincipalStr === userId;

  const { data: profile, isLoading: profileLoading } =
    useGetProfile(targetPrincipal);
  const { data: posts, isLoading: postsLoading } =
    useGetPostsByUser(targetPrincipal);
  const { data: garage, isLoading: garageLoading } =
    useGarageByUser(targetPrincipal);
  const { data: followers } = useGetFollowers(targetPrincipal);
  const { data: following } = useGetFollowing(targetPrincipal);
  const { data: isFollowing, isLoading: isFollowingLoading } =
    useIsFollowing(targetPrincipal);

  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const [followPending, setFollowPending] = useState(false);
  const [followListMode, setFollowListMode] = useState<
    "followers" | "following" | null
  >(null);

  const displayName = profile?.displayName || truncatePrincipal(userId);
  const avatarUrl = profile?.avatarUrl ?? "";
  const bannerUrl = profile?.bannerUrl ?? "";
  const bio = profile?.bio ?? "";
  const location = getDisplayLocation(profile?.location ?? "");

  const displayPosts = posts ?? [];
  const displayGarage = garage ?? [];

  const handleFollowToggle = () => {
    if (!targetPrincipal) return;
    setFollowPending(true);
    if (isFollowing) {
      unfollowUser.mutate(targetPrincipal, {
        onSuccess: () => {
          toast.success(`Unfollowed ${displayName}`);
          setFollowPending(false);
        },
        onError: () => {
          toast.error("Failed to unfollow");
          setFollowPending(false);
        },
      });
    } else {
      followUser.mutate(targetPrincipal, {
        onSuccess: () => {
          toast.success(`Following ${displayName}!`);
          setFollowPending(false);
        },
        onError: () => {
          toast.error("Failed to follow");
          setFollowPending(false);
        },
      });
    }
  };

  const handleMessageUser = () => {
    void navigate({ to: "/messages", search: { recipient: userId } });
  };

  if (parseError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "oklch(var(--surface))" }}
        >
          <UserPlus size={28} className="text-steel" />
        </div>
        <h2 className="font-display text-xl font-bold">Invalid Profile</h2>
        <p className="text-steel text-sm">This Principal ID is not valid.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void navigate({ to: "/" })}
          className="border-border text-steel"
        >
          <ArrowLeft size={14} className="mr-2" />
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="page-header">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void navigate({ to: "/" })}
            className="text-steel hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-xl font-bold truncate max-w-[180px]">
            {profileLoading ? "Loading..." : displayName}
          </h1>
        </div>
        {/* Message button (only for other users) */}
        {!isOwnProfile && (
          <button
            type="button"
            onClick={handleMessageUser}
            className="p-2 text-steel hover:text-foreground transition-colors"
          >
            <MessageCircle size={20} />
          </button>
        )}
      </header>

      {/* Banner */}
      <div className="relative">
        <div className="h-36 w-full bg-surface overflow-hidden">
          {profileLoading ? (
            <Skeleton className="w-full h-full" />
          ) : bannerUrl ? (
            <img
              src={bannerUrl}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background:
                  "linear-gradient(135deg, oklch(var(--carbon)) 0%, oklch(var(--surface)) 50%, oklch(var(--orange) / 0.15) 100%)",
              }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 50%, oklch(var(--background)) 100%)",
            }}
          />
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-10 left-4">
          <div
            className="rounded-full p-1"
            style={{ background: "oklch(var(--background))" }}
          >
            <Avatar className="w-20 h-20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback
                style={{
                  background: "oklch(var(--orange))",
                  color: "oklch(var(--carbon))",
                }}
                className="text-xl font-bold"
              >
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Profile info */}
      <div className="px-4 pt-12 pb-4">
        {profileLoading ? (
          <div className="space-y-2">
            <Skeleton className="w-40 h-5" />
            <Skeleton className="w-64 h-4" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                  {displayName}
                  <FriendBadge principalStr={userId} />
                </h2>
                {location && (
                  <div className="flex items-center gap-1 text-steel text-xs mt-0.5">
                    <MapPin size={11} />
                    <span>{location}</span>
                  </div>
                )}
              </div>

              {/* Follow / Edit button */}
              {isOwnProfile ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void navigate({ to: "/settings" })}
                  className="shrink-0 text-xs border-border text-steel hover:text-foreground"
                >
                  Edit Profile
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleFollowToggle}
                  disabled={followPending || isFollowingLoading}
                  className="shrink-0 text-xs font-bold"
                  style={
                    isFollowing
                      ? {
                          background: "oklch(var(--orange))",
                          color: "oklch(var(--carbon))",
                        }
                      : {
                          background: "transparent",
                          border: "1.5px solid oklch(var(--orange))",
                          color: "oklch(var(--orange-bright))",
                        }
                  }
                >
                  {followPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <UserCheck size={14} className="mr-1" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} className="mr-1" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>

            {bio && (
              <p className="text-sm text-foreground mt-2 leading-relaxed">
                {bio}
              </p>
            )}

            {/* Stats */}
            <div className="flex gap-6 mt-4">
              <div className="text-center">
                <p className="font-display text-xl font-bold text-foreground">
                  {displayPosts.length}
                </p>
                <p className="text-xs text-steel">Posts</p>
              </div>
              <button
                type="button"
                className="text-center cursor-pointer group"
                onClick={() => setFollowListMode("followers")}
              >
                <p className="font-display text-xl font-bold text-foreground group-hover:text-orange transition-colors">
                  {followers?.length ?? 0}
                </p>
                <p className="text-xs text-steel group-hover:text-orange transition-colors">
                  Followers
                </p>
              </button>
              <button
                type="button"
                className="text-center cursor-pointer group"
                onClick={() => setFollowListMode("following")}
              >
                <p className="font-display text-xl font-bold text-foreground group-hover:text-orange transition-colors">
                  {following?.length ?? 0}
                </p>
                <p className="text-xs text-steel group-hover:text-orange transition-colors">
                  Following
                </p>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="px-4">
        <TabsList
          className="w-full mb-4"
          style={{ background: "oklch(var(--surface))" }}
        >
          <TabsTrigger value="posts" className="flex-1 gap-1.5">
            <Grid3X3 size={14} />
            Posts
          </TabsTrigger>
          <TabsTrigger value="garage" className="flex-1 gap-1.5">
            <Car size={14} />
            Garage
          </TabsTrigger>
          <TabsTrigger value="gifts" className="flex-1 gap-1.5">
            <Gift size={14} />
            Items
          </TabsTrigger>
          <TabsTrigger value="about" className="flex-1 gap-1.5">
            <Info size={14} />
            About
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          {postsLoading ? (
            <div className="grid grid-cols-3 gap-1">
              {["p1", "p2", "p3", "p4", "p5", "p6"].map((k) => (
                <Skeleton key={k} className="aspect-square" />
              ))}
            </div>
          ) : displayPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "oklch(var(--surface))" }}
              >
                <Grid3X3 size={24} className="text-steel" />
              </div>
              <p className="text-foreground font-semibold text-sm">
                No posts yet
              </p>
              <p className="text-steel text-xs mt-1">
                {isOwnProfile
                  ? "Share your first build, car meet, or drive"
                  : "This user hasn't posted anything yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {displayPosts.map((post) => (
                <div
                  key={post.id}
                  className="relative aspect-square overflow-hidden group cursor-pointer"
                  style={{ borderRadius: "4px" }}
                >
                  {post.mediaUrls[0] ? (
                    post.postType?.toLowerCase() === "video" ||
                    post.postType?.toLowerCase() === "reel" ? (
                      <video
                        src={post.mediaUrls[0]}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        muted
                        playsInline
                      >
                        <track kind="captions" />
                      </video>
                    ) : (
                      <img
                        src={post.mediaUrls[0]}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center p-2"
                      style={{ background: "oklch(var(--surface))" }}
                    >
                      <p className="text-xs text-steel text-center line-clamp-3">
                        {post.content}
                      </p>
                    </div>
                  )}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    style={{ background: "oklch(0 0 0 / 0.5)" }}
                  >
                    <span className="text-white text-xs">
                      ♥ {post.likes.length}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="garage">
          {garageLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {["g1", "g2"].map((k) => (
                <Skeleton key={k} className="h-40 rounded-lg" />
              ))}
            </div>
          ) : displayGarage.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "oklch(var(--surface))" }}
              >
                <Car size={24} className="text-steel" />
              </div>
              <p className="text-foreground font-semibold text-sm">
                Empty Garage
              </p>
              <p className="text-steel text-xs mt-1">
                {isOwnProfile
                  ? "Add your first car to showcase your build"
                  : "This user hasn't added any cars yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {displayGarage.map((car) => (
                <div
                  key={car.id}
                  className="relative overflow-hidden rounded-lg"
                  style={{ border: "1px solid oklch(var(--border))" }}
                >
                  {car.imageUrls[0] ? (
                    <img
                      src={car.imageUrls[0]}
                      alt={`${car.year} ${car.make} ${car.model}`}
                      className="w-full h-28 object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-28 flex items-center justify-center"
                      style={{ background: "oklch(var(--surface-elevated))" }}
                    >
                      <Car size={24} className="text-steel" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-xs font-semibold text-foreground">
                      {car.year} {car.make} {car.model}
                    </p>
                    {car.color && (
                      <Badge
                        className="mt-1 text-[9px] px-1.5 py-0"
                        style={{
                          background: "oklch(var(--orange) / 0.15)",
                          color: "oklch(var(--orange-bright))",
                          border: "1px solid oklch(var(--orange) / 0.3)",
                        }}
                      >
                        {car.color}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="gifts">
          {(() => {
            const giftSummary = getGiftSummary(userId);
            if (giftSummary.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: "oklch(var(--surface))" }}
                  >
                    <Gift size={24} className="text-steel" />
                  </div>
                  <p className="text-foreground font-semibold text-sm">
                    No items yet
                  </p>
                  <p className="text-steel text-xs mt-1">
                    {isOwnProfile
                      ? "Items gifted to you will appear here"
                      : "This user hasn't received any gifts yet"}
                  </p>
                </div>
              );
            }
            return (
              <div className="pb-6">
                <p className="text-xs text-steel mb-3">
                  {giftSummary.reduce((acc, g) => acc + g.count, 0)} items
                  collected
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {giftSummary.map((gift) => (
                    <div
                      key={gift.giftId}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl relative overflow-hidden"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(var(--surface)), oklch(var(--surface-elevated)))",
                        border: "1px solid oklch(var(--border))",
                      }}
                    >
                      {/* Count badge */}
                      {gift.count > 1 && (
                        <span
                          className="absolute top-2 right-2 min-w-[20px] h-5 rounded-full text-[10px] font-black flex items-center justify-center px-1.5"
                          style={{
                            background: "oklch(var(--orange))",
                            color: "oklch(var(--carbon))",
                          }}
                        >
                          x{gift.count}
                        </span>
                      )}
                      <span className="text-4xl">{gift.giftEmoji}</span>
                      <p className="text-xs font-semibold text-foreground text-center leading-tight">
                        {gift.giftName}
                      </p>
                      <Badge
                        className="text-[9px] px-2 py-0"
                        style={{
                          background: "oklch(var(--orange) / 0.12)",
                          color: "oklch(var(--orange-bright))",
                          border: "1px solid oklch(var(--orange) / 0.25)",
                        }}
                      >
                        {gift.count === 1
                          ? "1 received"
                          : `${gift.count} received`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="about">
          <div
            className="rounded-lg p-4 space-y-3"
            style={{
              background: "oklch(var(--surface))",
              border: "1px solid oklch(var(--border))",
            }}
          >
            <div>
              <p className="text-xs text-steel uppercase tracking-wider mb-1 font-semibold">
                Display Name
              </p>
              <p className="text-sm text-foreground">{displayName}</p>
            </div>
            {bio && (
              <div>
                <p className="text-xs text-steel uppercase tracking-wider mb-1 font-semibold">
                  Bio
                </p>
                <p className="text-sm text-foreground">{bio}</p>
              </div>
            )}
            {location && (
              <div>
                <p className="text-xs text-steel uppercase tracking-wider mb-1 font-semibold">
                  Location
                </p>
                <p className="text-sm text-foreground">{location}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-steel uppercase tracking-wider mb-1 font-semibold">
                Principal ID
              </p>
              <p className="text-xs text-steel font-mono break-all">{userId}</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-steel border-t border-border mt-6">
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

      {/* Follow list modals */}
      <FollowListModal
        title="Followers"
        principals={followers ?? []}
        open={followListMode === "followers"}
        onClose={() => setFollowListMode(null)}
      />
      <FollowListModal
        title="Following"
        principals={following ?? []}
        open={followListMode === "following"}
        onClose={() => setFollowListMode(null)}
      />
    </div>
  );
}
