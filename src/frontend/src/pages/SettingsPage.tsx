import { useState, useEffect, useRef } from "react";
import { Loader2, User, MapPin, FileText, Camera, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile, useUpdateProfile, useUploadFile } from "../hooks/useQueries";
import { getInitials } from "../utils/format";
import { toast } from "sonner";

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
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarProgress(0);
    try {
      const url = await uploadFile(file, (pct) => setAvatarProgress(pct));
      setForm((f) => ({ ...f, avatarUrl: url }));
      toast.success("Avatar uploaded!");
    } catch {
      toast.error("Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
      setAvatarProgress(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    setBannerProgress(0);
    try {
      const url = await uploadFile(file, (pct) => setBannerProgress(pct));
      setForm((f) => ({ ...f, bannerUrl: url }));
      toast.success("Banner uploaded!");
    } catch {
      toast.error("Failed to upload banner");
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

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <h1 className="font-display text-2xl font-bold">Edit Profile</h1>
      </header>

      <div className="p-4 max-w-xl mx-auto">
        {/* Avatar & Banner Preview Card */}
        <div
          className="rounded-xl overflow-hidden mb-6"
          style={{ border: "1px solid oklch(var(--border))", background: "oklch(var(--surface))" }}
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
                style={{ background: "linear-gradient(135deg, oklch(var(--carbon)) 0%, oklch(var(--surface)) 50%, oklch(var(--orange) / 0.15) 100%)" }}
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
                  <span className="text-white text-xs">{Math.round(bannerProgress ?? 0)}%</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <ImagePlus size={20} className="text-white" />
                  <span className="text-white text-xs font-semibold">Change Banner</span>
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
                <Avatar className="w-16 h-16 border-2" style={{ borderColor: "oklch(var(--surface))" }}>
                  <AvatarImage src={form.avatarUrl} />
                  <AvatarFallback
                    style={{ background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }}
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
              <p className="font-semibold text-foreground">{form.displayName || "Your Name"}</p>
              <p className="text-xs text-steel">{form.location || "No location set"}</p>
            </div>
          </div>
        </div>

        {/* Avatar upload progress */}
        {avatarProgress !== null && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-steel">Uploading avatar...</span>
              <span className="text-xs font-semibold" style={{ color: "oklch(var(--orange))" }}>
                {Math.round(avatarProgress)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(var(--surface))" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${avatarProgress}%`, background: "oklch(var(--orange))" }}
              />
            </div>
          </div>
        )}

        {/* Banner upload progress */}
        {bannerProgress !== null && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-steel">Uploading banner...</span>
              <span className="text-xs font-semibold" style={{ color: "oklch(var(--orange))" }}>
                {Math.round(bannerProgress)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(var(--surface))" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${bannerProgress}%`, background: "oklch(var(--orange))" }}
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
            {avatarUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            Change Avatar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => bannerInputRef.current?.click()}
            disabled={bannerUploading}
            className="flex items-center gap-2 text-sm border-border text-steel hover:text-foreground"
          >
            {bannerUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
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
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Your display name"
                maxLength={50}
                style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--border))" }}
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
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Tell the community about you and your build..."
                className="min-h-[80px] resize-none text-sm"
                maxLength={200}
                style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--border))" }}
              />
            )}
            <p className="text-[11px] text-steel text-right mt-0.5">{form.bio.length}/200</p>
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
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Los Angeles, CA"
                maxLength={100}
                style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--border))" }}
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
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-steel border-t border-border mt-6">
        © 2026. Built with ❤️ using{" "}
        <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="text-orange hover:underline">
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
