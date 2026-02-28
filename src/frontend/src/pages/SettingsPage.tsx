import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Camera,
  Check,
  Crown,
  FileText,
  ImagePlus,
  Loader2,
  MapPin,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useMyProfile,
  useUpdateProfile,
  useUploadFile,
} from "../hooks/useQueries";
import { convertHeicToJpeg } from "../lib/convertHeic";
import { isUserPro } from "../lib/pro";
import { getInitials } from "../utils/format";

const STRIPE_LINK = "https://buy.stripe.com/bJe9AUd3V0kIfpjcFp9EI00";

const PRO_PERKS = [
  "Verified Pro badge on your profile",
  "Priority placement in Leaderboard",
  "Ad-free experience",
  "Exclusive Pro member crown",
  "Support RevSpace development",
];

function ProCard() {
  const isPro = isUserPro();

  if (isPro) {
    return (
      <div
        className="rounded-2xl p-5 mt-6"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.16 0.04 90 / 0.9) 0%, oklch(0.13 0.02 260 / 0.95) 100%)",
          border: "1px solid oklch(0.78 0.18 85 / 0.5)",
          boxShadow:
            "0 0 32px oklch(0.78 0.18 85 / 0.15), inset 0 1px 0 oklch(0.78 0.18 85 / 0.2)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "oklch(0.78 0.18 85 / 0.2)" }}
          >
            <Crown size={20} style={{ color: "oklch(0.82 0.18 85)" }} />
          </div>
          <div>
            <p
              className="font-bold text-base"
              style={{ color: "oklch(0.82 0.18 85)" }}
            >
              RevSpace Pro Member
            </p>
            <p
              className="text-xs"
              style={{ color: "oklch(0.78 0.18 85 / 0.7)" }}
            >
              You're unlocked. All Pro perks are active.
            </p>
          </div>
          <div className="ml-auto">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "oklch(0.78 0.18 85 / 0.2)" }}
            >
              <Check size={14} style={{ color: "oklch(0.82 0.18 85)" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 mt-6"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.14 0.03 85 / 0.6) 0%, oklch(0.12 0.01 260 / 0.9) 100%)",
        border: "1px solid oklch(0.75 0.16 85 / 0.35)",
        boxShadow: "0 0 24px oklch(0.75 0.16 85 / 0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "oklch(0.78 0.18 85 / 0.15)" }}
        >
          <Crown size={20} style={{ color: "oklch(0.82 0.18 85)" }} />
        </div>
        <div>
          <p
            className="font-bold text-base"
            style={{ color: "oklch(0.82 0.18 85)" }}
          >
            RevSpace Pro
          </p>
          <p className="text-xs" style={{ color: "oklch(0.6 0.08 85)" }}>
            Unlock the full RevSpace experience
          </p>
        </div>
      </div>

      {/* Perks */}
      <ul className="space-y-2 mb-5">
        {PRO_PERKS.map((perk) => (
          <li key={perk} className="flex items-center gap-2.5">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.78 0.18 85 / 0.2)" }}
            >
              <Check size={9} style={{ color: "oklch(0.82 0.18 85)" }} />
            </div>
            <span className="text-sm" style={{ color: "oklch(0.8 0.04 260)" }}>
              {perk}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        type="button"
        onClick={() => {
          window.location.href = STRIPE_LINK;
        }}
        className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.78 0.18 85) 0%, oklch(0.72 0.16 65) 100%)",
          color: "oklch(0.12 0.03 85)",
          boxShadow:
            "0 4px 24px oklch(0.78 0.18 85 / 0.35), 0 1px 0 oklch(1 0 0 / 0.3) inset",
        }}
      >
        <Zap size={15} />
        Upgrade to Pro
        <Crown size={14} />
      </button>

      <p
        className="text-center text-[11px] mt-3"
        style={{ color: "oklch(0.5 0.04 260)" }}
      >
        One-time payment · Instant badge activation
      </p>
    </div>
  );
}

export function SettingsPage() {
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const uploadFile = useUploadFile();

  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    avatarUrl: "",
    bannerUrl: "",
    location: "",
  });

  const [initialized, setInitialized] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState<number | null>(null);
  const [bannerProgress, setBannerProgress] = useState<number | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile && !initialized) {
      setForm({
        displayName: profile.displayName ?? "",
        bio: profile.bio ?? "",
        avatarUrl: profile.avatarUrl ?? "",
        bannerUrl: profile.bannerUrl ?? "",
        location: profile.location ?? "",
      });
      setInitialized(true);
    }
  }, [profile, initialized]);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    file = await convertHeicToJpeg(file);
    setAvatarUploading(true);
    setAvatarProgress(0);
    try {
      const url = await uploadFile(file, (pct) => setAvatarProgress(pct));
      setForm((f) => ({ ...f, avatarUrl: url }));
      toast.success("Avatar uploaded!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload avatar",
      );
    } finally {
      setAvatarUploading(false);
      setAvatarProgress(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    file = await convertHeicToJpeg(file);
    setBannerUploading(true);
    setBannerProgress(0);
    try {
      const url = await uploadFile(file, (pct) => setBannerProgress(pct));
      setForm((f) => ({ ...f, bannerUrl: url }));
      toast.success("Banner uploaded!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload banner",
      );
    } finally {
      setBannerUploading(false);
      setBannerProgress(null);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(form, {
      onSuccess: () => toast.success("Profile updated! ✅"),
      onError: () => toast.error("Failed to update profile"),
    });
  };

  const isBusy = avatarUploading || bannerUploading;
  const profileMissing = !isLoading && !form.displayName;

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <h1 className="font-display text-2xl font-bold">Edit Profile</h1>
      </header>

      <div className="p-4 max-w-xl mx-auto">
        {profileMissing && (
          <div
            className="flex items-start gap-3 rounded-xl p-4 mb-5"
            style={{
              background: "oklch(0.22 0.08 55 / 0.25)",
              border: "1px solid oklch(0.72 0.18 55 / 0.5)",
            }}
          >
            <AlertTriangle
              size={18}
              className="shrink-0 mt-0.5"
              style={{ color: "oklch(0.82 0.18 65)" }}
            />
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "oklch(0.88 0.14 65)" }}
              >
                Profile not set yet
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "oklch(0.7 0.08 65)" }}
              >
                Fill in your display name below and tap Save Profile. It will be
                stored both on-chain and locally so it won't disappear again.
              </p>
            </div>
          </div>
        )}
        {/* Avatar & Banner Preview Card */}
        <div
          className="rounded-xl overflow-hidden mb-6"
          style={{
            border: "1px solid oklch(var(--border))",
            background: "oklch(var(--surface))",
          }}
        >
          {/* Banner */}
          <div className="relative h-24 overflow-hidden">
            {form.bannerUrl ? (
              <img
                src={form.bannerUrl}
                alt="Banner preview"
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
            {/* Banner upload button */}
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={bannerUploading}
              className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              style={{ background: "oklch(0 0 0 / 0.5)" }}
            >
              {bannerUploading ? (
                <div className="flex flex-col items-center gap-1">
                  <Loader2 size={20} className="text-white animate-spin" />
                  <span className="text-white text-xs">
                    {Math.round(bannerProgress ?? 0)}%
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <ImagePlus size={20} className="text-white" />
                  <span className="text-white text-xs font-semibold">
                    Change Banner
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Avatar + Name */}
          <div className="flex items-center gap-3 px-4 pt-3 pb-4">
            <div className="relative -mt-8">
              {isLoading ? (
                <Skeleton className="w-16 h-16 rounded-full" />
              ) : (
                <Avatar
                  className="w-16 h-16 border-2"
                  style={{ borderColor: "oklch(var(--surface))" }}
                >
                  <AvatarImage src={form.avatarUrl} />
                  <AvatarFallback
                    style={{
                      background: "oklch(var(--orange))",
                      color: "oklch(var(--carbon))",
                    }}
                    className="text-xl font-bold"
                  >
                    {getInitials(form.displayName || "??")}
                  </AvatarFallback>
                </Avatar>
              )}
              {/* Avatar upload button */}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                style={{ background: "oklch(0 0 0 / 0.6)" }}
              >
                {avatarUploading ? (
                  <Loader2 size={14} className="text-white animate-spin" />
                ) : (
                  <Camera size={14} className="text-white" />
                )}
              </button>
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {form.displayName || "Your Name"}
              </p>
              <p className="text-xs text-steel">
                {form.location || "No location set"}
              </p>
            </div>
          </div>
        </div>

        {/* Avatar upload progress */}
        {avatarProgress !== null && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-steel">Uploading avatar...</span>
              <span
                className="text-xs font-semibold"
                style={{ color: "oklch(var(--orange))" }}
              >
                {Math.round(avatarProgress)}%
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "oklch(var(--surface))" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${avatarProgress}%`,
                  background: "oklch(var(--orange))",
                }}
              />
            </div>
          </div>
        )}

        {/* Banner upload progress */}
        {bannerProgress !== null && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-steel">Uploading banner...</span>
              <span
                className="text-xs font-semibold"
                style={{ color: "oklch(var(--orange))" }}
              >
                {Math.round(bannerProgress)}%
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "oklch(var(--surface))" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${bannerProgress}%`,
                  background: "oklch(var(--orange))",
                }}
              />
            </div>
          </div>
        )}

        {/* Photo upload inputs (hidden) */}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFile}
        />
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBannerFile}
        />

        {/* Upload Buttons Row */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="flex items-center gap-2 text-sm border-border text-steel hover:text-foreground"
          >
            {avatarUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Camera size={14} />
            )}
            Change Avatar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => bannerInputRef.current?.click()}
            disabled={bannerUploading}
            className="flex items-center gap-2 text-sm border-border text-steel hover:text-foreground"
          >
            {bannerUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ImagePlus size={14} />
            )}
            Change Banner
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="text-xs text-steel mb-1.5 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <User size={12} />
              Display Name
            </Label>
            {isLoading ? (
              <Skeleton className="w-full h-10" />
            ) : (
              <Input
                value={form.displayName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, displayName: e.target.value }))
                }
                placeholder="Your display name"
                maxLength={50}
                style={{
                  background: "oklch(var(--surface))",
                  borderColor: "oklch(var(--border))",
                }}
              />
            )}
          </div>

          <div>
            <Label className="text-xs text-steel mb-1.5 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <FileText size={12} />
              Bio
            </Label>
            {isLoading ? (
              <Skeleton className="w-full h-20" />
            ) : (
              <Textarea
                value={form.bio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bio: e.target.value }))
                }
                placeholder="Tell the community about you and your build..."
                className="min-h-[80px] resize-none text-sm"
                maxLength={200}
                style={{
                  background: "oklch(var(--surface))",
                  borderColor: "oklch(var(--border))",
                }}
              />
            )}
            <p className="text-[11px] text-steel text-right mt-0.5">
              {form.bio.length}/200
            </p>
          </div>

          <div>
            <Label className="text-xs text-steel mb-1.5 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <MapPin size={12} />
              Location
            </Label>
            {isLoading ? (
              <Skeleton className="w-full h-10" />
            ) : (
              <Input
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
                placeholder="Los Angeles, CA"
                maxLength={100}
                style={{
                  background: "oklch(var(--surface))",
                  borderColor: "oklch(var(--border))",
                }}
              />
            )}
          </div>

          <Button
            type="submit"
            disabled={updateProfile.isPending || isLoading || isBusy}
            className="w-full h-12 text-base font-bold rounded-xl"
            style={{
              background: "oklch(var(--orange))",
              color: "oklch(var(--carbon))",
              boxShadow: "0 0 30px oklch(var(--orange) / 0.3)",
            }}
          >
            {updateProfile.isPending ? (
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </div>
            ) : (
              "Save Profile"
            )}
          </Button>
        </form>

        {/* RevSpace Pro upgrade card */}
        <ProCard />
      </div>

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
    </div>
  );
}
