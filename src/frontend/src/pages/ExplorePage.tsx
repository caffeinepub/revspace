import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Principal } from "@icp-sdk/core/principal";
import { Link, useNavigate } from "@tanstack/react-router";
import { Calendar, Search, TrendingUp, UserSearch, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAllClubs, useAllEvents, useGetAllPosts } from "../hooks/useQueries";
import { formatDate } from "../utils/format";

export function ExplorePage() {
  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userSearchError, setUserSearchError] = useState("");
  const navigate = useNavigate();
  const { data: posts, isLoading: postsLoading } = useGetAllPosts();
  const { data: events, isLoading: eventsLoading } = useAllEvents();
  const { data: clubs, isLoading: clubsLoading } = useAllClubs();

  const handleUserSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setUserSearchError("");
    const trimmed = userSearch.trim();
    if (!trimmed) {
      setUserSearchError("Please enter a Principal ID");
      return;
    }
    try {
      Principal.fromText(trimmed);
      void navigate({ to: "/profile/$userId", params: { userId: trimmed } });
    } catch {
      setUserSearchError("Invalid Principal ID format");
      toast.error("That doesn't look like a valid Principal ID");
    }
  };

  const displayPosts = posts ?? [];
  const displayEvents = events ?? [];
  const displayClubs = clubs ?? [];

  const filteredPosts = displayPosts.filter((p) =>
    search ? p.content.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="min-h-screen">
      {/* Urban Banner */}
      <div className="relative w-full h-[160px] md:h-[220px] overflow-hidden">
        <img
          src="/assets/generated/urban-explore-banner.dim_1600x400.jpg"
          alt="Explore"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 urban-overlay" />
        <div className="absolute bottom-4 left-4">
          <h1 className="tag-text text-3xl text-white">Explore</h1>
          <p className="text-white/60 text-xs mt-0.5">
            Discover builds, events &amp; clubs
          </p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6 max-w-2xl mx-auto lg:max-w-none">
        {/* Post Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-steel pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts, cars, builds..."
            className="pl-9 text-sm"
            style={{
              background: "oklch(var(--surface))",
              borderColor: "oklch(var(--border))",
            }}
          />
        </div>

        {/* Find Users */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <UserSearch size={16} className="text-orange" />
            <h2 className="font-display text-lg font-bold">Find Users</h2>
          </div>
          <div
            className="p-4 rounded-xl"
            style={{
              background: "oklch(var(--surface))",
              border: "1px solid oklch(var(--border))",
            }}
          >
            <p className="text-xs text-steel mb-3">
              Enter a user's Principal ID to view their profile, posts, and
              garage
            </p>
            <form onSubmit={handleUserSearch} className="flex gap-2">
              <Input
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserSearchError("");
                }}
                placeholder="xxxxx-xxxxx-xxxxx-xxxxx-cai"
                className="flex-1 font-mono text-xs"
                style={{
                  background: "oklch(var(--surface-elevated))",
                  borderColor: userSearchError
                    ? "oklch(var(--destructive))"
                    : "oklch(var(--border))",
                }}
              />
              <Button
                type="submit"
                size="sm"
                style={{
                  background: "oklch(var(--orange))",
                  color: "oklch(var(--carbon))",
                }}
              >
                View
              </Button>
            </form>
            {userSearchError && (
              <p
                className="text-xs mt-1.5"
                style={{ color: "oklch(var(--destructive))" }}
              >
                {userSearchError}
              </p>
            )}
          </div>
        </section>

        {/* Trending Posts Grid */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-orange" />
            <h2 className="font-display text-lg font-bold">Trending Posts</h2>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {postsLoading
              ? ["g1", "g2", "g3", "g4", "g5", "g6"].map((k) => (
                  <Skeleton key={k} className="aspect-square" />
                ))
              : filteredPosts.slice(0, 9).map((post) => (
                  <div
                    key={post.id}
                    className="relative aspect-square overflow-hidden cursor-pointer group"
                    style={{
                      borderRadius: "4px",
                      background: "oklch(0.18 0.01 240)",
                    }}
                  >
                    {post.mediaUrls[0] ? (
                      <img
                        src={post.mediaUrls[0]}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    ) : null}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      style={{ background: "oklch(0 0 0 / 0.4)" }}
                    >
                      <span className="text-white text-xs font-semibold">
                        ♥ {post.likes.length}
                      </span>
                    </div>
                  </div>
                ))}
          </div>
        </section>

        {/* Upcoming Events */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-orange" />
              <h2 className="font-display text-lg font-bold">
                Upcoming Events
              </h2>
            </div>
            <Link to="/events" className="text-xs text-orange hover:underline">
              See all
            </Link>
          </div>
          <div className="space-y-3">
            {eventsLoading
              ? ["e1", "e2"].map((k) => (
                  <div key={k} className="flex gap-3">
                    <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="w-3/4 h-3" />
                      <Skeleton className="w-1/2 h-3" />
                    </div>
                  </div>
                ))
              : displayEvents.slice(0, 3).map((event) => (
                  <Link key={event.id} to="/events">
                    <div
                      className="flex gap-3 p-3 rounded-lg hover:bg-surface-raised transition-colors"
                      style={{
                        background: "oklch(var(--surface))",
                        border: "1px solid oklch(var(--border))",
                      }}
                    >
                      <img
                        src={
                          event.coverImageUrl ||
                          `https://picsum.photos/seed/${event.id}/100/100`
                        }
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-steel mt-0.5">
                          {formatDate(event.eventDate)}
                        </p>
                        <p className="text-xs text-steel truncate">
                          {event.location}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: "oklch(var(--orange) / 0.15)",
                              color: "oklch(var(--orange-bright))",
                            }}
                          >
                            {event.category}
                          </span>
                          <span className="text-[10px] text-steel">
                            {event.attendees.length} attending
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
        </section>

        {/* Featured Clubs */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-orange" />
              <h2 className="font-display text-lg font-bold">Featured Clubs</h2>
            </div>
            <Link to="/clubs" className="text-xs text-orange hover:underline">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {clubsLoading
              ? ["c1", "c2", "c3", "c4"].map((k) => (
                  <Skeleton key={k} className="h-28 rounded-lg" />
                ))
              : displayClubs.slice(0, 4).map((club) => (
                  <Link key={club.id} to="/clubs">
                    <div
                      className="relative overflow-hidden rounded-lg cursor-pointer group"
                      style={{ border: "1px solid oklch(var(--border))" }}
                    >
                      <img
                        src={
                          club.coverImageUrl ||
                          `https://picsum.photos/seed/${club.id}/400/200`
                        }
                        alt=""
                        className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(to top, oklch(0 0 0 / 0.8) 0%, transparent 60%)",
                        }}
                      />
                      <div className="absolute bottom-2 left-3 right-3">
                        <p className="text-white text-xs font-bold truncate">
                          {club.name}
                        </p>
                        <p className="text-white/60 text-[10px]">
                          {club.members.length} members
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
        </section>
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
    </div>
  );
}
