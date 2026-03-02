import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Principal } from "@icp-sdk/core/principal";
import { useNavigate } from "@tanstack/react-router";
import {
  ExternalLink,
  Instagram,
  MessageCircle,
  ShieldCheck,
  Star,
} from "lucide-react";
import { ProBadge } from "../components/ProBadge";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetFollowers,
  useGetFollowing,
  useGetPostsByUser,
  useGetProfile,
} from "../hooks/useQueries";
import { getInitials } from "../utils/format";

const OWNER_PRINCIPAL =
  "lxabr-wc334-2wlj6-karlm-6ez4a-sahnr-7s7ge-2onmm-u4ht3-pue6x-jae";

export function CreatorPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const myPrincipalStr = identity?.getPrincipal().toString() ?? "";
  const isOwner = myPrincipalStr === OWNER_PRINCIPAL;

  let ownerPrincipal: Principal | undefined;
  try {
    ownerPrincipal = Principal.fromText(OWNER_PRINCIPAL);
  } catch {
    ownerPrincipal = undefined;
  }

  const { data: profile, isLoading } = useGetProfile(ownerPrincipal);
  const { data: posts } = useGetPostsByUser(ownerPrincipal);
  const { data: followers } = useGetFollowers(ownerPrincipal);
  const { data: following } = useGetFollowing(ownerPrincipal);

  const displayName = profile?.displayName || "RevSpace Creator";
  const avatarUrl = profile?.avatarUrl ?? "";
  const bannerUrl = profile?.bannerUrl ?? "";
  const bio =
    profile?.bio ||
    "Founder of RevSpace — the social hub for car culture. Connect with me on Instagram @boddysum.";

  const postCount = posts?.length ?? 0;
  const followerCount = followers?.length ?? 0;
  const followingCount = following?.length ?? 0;

  const handleDM = () => {
    void navigate({
      to: "/messages",
      search: { recipient: OWNER_PRINCIPAL },
    });
  };

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "oklch(var(--carbon))" }}
    >
      {/* Banner */}
      <div
        className="relative w-full h-48 md:h-64 overflow-hidden"
        style={{ background: "oklch(0.15 0.02 240)" }}
        data-ocid="creator.banner_section"
      >
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt="Creator banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.12 0.02 240) 0%, oklch(0.22 0.18 35) 100%)",
            }}
          />
        )}
        {/* Orange overlay stripe */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ background: "oklch(var(--orange))" }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Avatar row */}
        <div className="flex items-end justify-between -mt-14 mb-4">
          <div className="relative">
            <Avatar
              className="w-28 h-28 border-4"
              style={{ borderColor: "oklch(var(--carbon))" }}
              data-ocid="creator.avatar"
            >
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback
                style={{ background: "oklch(var(--surface))" }}
                className="text-2xl font-bold text-white"
              >
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            {/* Verified shield */}
            <div
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2"
              style={{
                background: "oklch(var(--orange))",
                borderColor: "oklch(var(--carbon))",
              }}
            >
              <ShieldCheck size={14} className="text-white" />
            </div>
          </div>

          <div className="flex gap-2 items-center pb-2">
            {!isOwner && (
              <Button
                onClick={handleDM}
                size="sm"
                className="gap-1.5 font-semibold"
                style={{
                  background: "oklch(var(--orange))",
                  color: "white",
                }}
                data-ocid="creator.dm_button"
              >
                <MessageCircle size={15} />
                Message
              </Button>
            )}
            <a
              href="https://www.instagram.com/boddysum"
              target="_blank"
              rel="noopener noreferrer"
              data-ocid="creator.instagram_link"
            >
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 font-semibold border-white/20 text-white hover:bg-white/10"
              >
                <Instagram size={15} />
                @boddysum
              </Button>
            </a>
          </div>
        </div>

        {/* Name + badges */}
        {isLoading ? (
          <div className="h-6 w-40 rounded animate-pulse bg-white/10 mb-2" />
        ) : (
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-white">{displayName}</h1>
            <ProBadge />
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide"
              style={{
                background: "oklch(0.55 0.22 75 / 0.2)",
                color: "oklch(0.85 0.22 75)",
                border: "1px solid oklch(0.55 0.22 75 / 0.4)",
              }}
            >
              <Star size={10} />
              Creator
            </span>
          </div>
        )}

        {/* Handle */}
        <p
          className="text-sm mb-3"
          style={{ color: "oklch(var(--steel-light))" }}
        >
          Founder &amp; Creator of RevSpace
        </p>

        {/* Bio */}
        {bio && (
          <p className="text-sm text-white/80 mb-4 leading-relaxed">{bio}</p>
        )}

        {/* Stats row */}
        <div
          className="flex gap-6 mb-6 py-3 border-y"
          style={{ borderColor: "oklch(var(--surface))" }}
          data-ocid="creator.stats_section"
        >
          <div className="text-center">
            <p className="text-lg font-bold text-white">{postCount}</p>
            <p
              className="text-xs"
              style={{ color: "oklch(var(--steel-light))" }}
            >
              Posts
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{followerCount}</p>
            <p
              className="text-xs"
              style={{ color: "oklch(var(--steel-light))" }}
            >
              Followers
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{followingCount}</p>
            <p
              className="text-xs"
              style={{ color: "oklch(var(--steel-light))" }}
            >
              Following
            </p>
          </div>
        </div>

        {/* Quick links */}
        <div className="space-y-3 mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">
            Connect
          </h2>
          <a
            href="https://www.instagram.com/boddysum"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/5"
            style={{ background: "oklch(var(--surface))" }}
            data-ocid="creator.instagram_card"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
              }}
            >
              <Instagram size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Instagram</p>
              <p
                className="text-xs truncate"
                style={{ color: "oklch(var(--steel-light))" }}
              >
                @boddysum
              </p>
            </div>
            <ExternalLink
              size={14}
              style={{ color: "oklch(var(--steel-light))" }}
            />
          </a>

          <a
            href="https://www.instagram.com/mr.altered"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/5"
            style={{ background: "oklch(var(--surface))" }}
            data-ocid="creator.altered_card"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "oklch(var(--orange))" }}
            >
              <Instagram size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                Altered Imports
              </p>
              <p
                className="text-xs truncate"
                style={{ color: "oklch(var(--steel-light))" }}
              >
                @mr.altered · Wenatchee · 509-679-1389
              </p>
            </div>
            <ExternalLink
              size={14}
              style={{ color: "oklch(var(--steel-light))" }}
            />
          </a>
        </div>

        {/* Full profile link */}
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/50 hover:text-white/80 text-xs"
            onClick={() =>
              void navigate({
                to: "/profile/$userId",
                params: { userId: OWNER_PRINCIPAL },
              })
            }
            data-ocid="creator.full_profile_button"
          >
            View full profile →
          </Button>
        </div>
      </div>
    </div>
  );
}
