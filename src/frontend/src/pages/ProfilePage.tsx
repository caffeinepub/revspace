import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@tanstack/react-router";
import { Car, Grid3X3, Info, MapPin, Settings, Wrench, X } from "lucide-react";
import { useState } from "react";
import { FollowListModal } from "../components/FollowListModal";
import { ProBadge } from "../components/ProBadge";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetFollowers,
  useGetFollowing,
  useGetPostsByUser,
  useMyGarage,
  useMyProfile,
} from "../hooks/useQueries";
import { getInitials, truncatePrincipal } from "../utils/format";

export function ProfilePage() {
  const { identity, clear } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal();
  const myPrincipalStr = myPrincipal?.toString() ?? "";
  const [followListMode, setFollowListMode] = useState<
    "followers" | "following" | null
  >(null);
  const [selectedMedia, setSelectedMedia] = useState<{
    url: string;
    type: "image" | "video";
  } | null>(null);

  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { data: posts, isLoading: postsLoading } =
    useGetPostsByUser(myPrincipal);
  const { data: garage, isLoading: garageLoading } = useMyGarage();
  const { data: followers } = useGetFollowers(myPrincipal);
  const { data: following } = useGetFollowing(myPrincipal);

  const displayName = profile?.displayName || truncatePrincipal(myPrincipalStr);
  const avatarUrl = profile?.avatarUrl ?? "";
  const bannerUrl = profile?.bannerUrl ?? "";
  const bio = profile?.bio ?? "";
  const location = profile?.location ?? "";

  const displayPosts = posts ?? [];
  const displayGarage = garage ?? [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="page-header">
        <h1 className="font-display text-2xl font-bold">My Profile</h1>
        <div className="flex items-center gap-2">
          <Link to="/settings">
            <button
              type="button"
              className="p-2 text-steel hover:text-foreground transition-colors"
            >
              <Settings size={20} />
            </button>
          </Link>
        </div>
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
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                  {displayName}
                  <ProBadge />
                </h2>
                {location && (
                  <div className="flex items-center gap-1 text-steel text-xs mt-0.5">
                    <MapPin size={11} />
                    <span>{location}</span>
                  </div>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={clear}
                variant="outline"
                className="text-xs border-border text-steel hover:text-foreground"
              >
                Sign Out
              </Button>
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
              <p className="text-steel text-xs mt-1 mb-4">
                Share your first build, car meet, or drive
              </p>
              <Link to="/create">
                <Button
                  type="button"
                  className="text-sm font-bold"
                  style={{
                    background: "oklch(var(--orange))",
                    color: "oklch(var(--carbon))",
                  }}
                >
                  Create First Post
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {displayPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className="relative aspect-square overflow-hidden group cursor-pointer"
                  style={{ borderRadius: "4px" }}
                  onClick={() => {
                    if (post.mediaUrls[0]) {
                      setSelectedMedia({
                        url: post.mediaUrls[0],
                        type:
                          post.postType === "Video" || post.postType === "Reel"
                            ? "video"
                            : "image",
                      });
                    }
                  }}
                >
                  {post.mediaUrls[0] ? (
                    post.postType === "Video" || post.postType === "Reel" ? (
                      <video
                        src={post.mediaUrls[0]}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        muted
                        playsInline
                      />
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
                </button>
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
              <p className="text-steel text-xs mt-1 mb-4">
                Add your first car to showcase your build
              </p>
              <Link to="/garage">
                <Button
                  type="button"
                  className="text-sm font-bold"
                  style={{
                    background: "oklch(var(--orange))",
                    color: "oklch(var(--carbon))",
                  }}
                >
                  Add Your First Car
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {displayGarage.map((car) => (
                <div
                  key={car.id}
                  className="relative overflow-hidden rounded-lg cursor-pointer group"
                  style={{ border: "1px solid oklch(var(--border))" }}
                >
                  {car.imageUrls[0] ? (
                    <button
                      type="button"
                      className="w-full block"
                      onClick={() =>
                        setSelectedMedia({
                          url: car.imageUrls[0],
                          type: "image",
                        })
                      }
                    >
                      <img
                        src={car.imageUrls[0]}
                        alt={`${car.year} ${car.make} ${car.model}`}
                        className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </button>
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
          <div className="mt-4">
            <Link to="/garage">
              <Button
                type="button"
                variant="outline"
                className="w-full border-border text-steel hover:text-foreground"
              >
                <Wrench size={14} className="mr-2" />
                Manage Garage
              </Button>
            </Link>
          </div>
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
              <p className="text-xs text-steel font-mono break-all">
                {myPrincipalStr}
              </p>
            </div>
          </div>
          <Link to="/settings" className="block mt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full border-border text-steel hover:text-foreground"
            >
              <Settings size={14} className="mr-2" />
              Edit Profile
            </Button>
          </Link>
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

      {/* Media lightbox */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{
            background: "oklch(0 0 0 / 0.92)",
            animation: "fadeInLightbox 0.2s ease both",
          }}
        >
          {/* Backdrop button to dismiss */}
          <button
            type="button"
            aria-label="Close lightbox"
            className="absolute inset-0 w-full h-full"
            onClick={() => setSelectedMedia(null)}
          />

          {/* Close X button */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSelectedMedia(null)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "oklch(1 0 0 / 0.12)" }}
          >
            <X size={20} color="white" />
          </button>

          {/* Media content — z-10 so it sits above backdrop button */}
          <div className="relative z-10 flex items-center justify-center p-4 max-w-full max-h-full">
            {selectedMedia.type === "video" ? (
              <video
                src={selectedMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-lg"
                style={{ maxHeight: "90vh" }}
              >
                <track kind="captions" />
              </video>
            ) : (
              <img
                src={selectedMedia.url}
                alt=""
                className="max-w-full max-h-full rounded-lg"
                style={{ maxHeight: "90vh", objectFit: "contain" }}
              />
            )}
          </div>

          <style>{`
            @keyframes fadeInLightbox {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
