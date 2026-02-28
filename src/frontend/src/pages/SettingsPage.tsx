import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Camera,
  Car,
  Check,
  Crown,
  FileText,
  ImagePlus,
  Loader2,
  MapPin,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useMyProfile,
  useUpdateProfile,
  useUploadFile,
} from "../hooks/useQueries";
import { convertToJpegIfNeeded } from "../lib/convertHeic";
import {
  getModelAccountData,
  isModelAccount,
  setModelAccount,
  setModelAccountData,
} from "../lib/modelAccount";
import { isUserPro } from "../lib/pro";
import { getCachedProfile } from "../lib/profileCache";
import { validateFile } from "../lib/uploadValidator";
import { getInitials } from "../utils/format";

const MODEL_SPECIALTIES = ["JDM", "Euro", "Stance", "Muscle", "Other"];

function ModelAccountCard() {
  const currentIsModel = isModelAccount();
  const [isModel, setIsModel] = useState(currentIsModel);
  const currentData = getModelAccountData();
  const [modelData, setModelData] = useState(currentData);

  const handleSave = () => {
    setModelAccount(isModel);
    if (isModel) {
      setModelAccountData(modelData);
    }
    toast.success("Account type saved!");
  };

  return (
    <div
      className="rounded-2xl p-5 mt-6"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.14 0.06 310 / 0.7) 0%, oklch(0.12 0.03 310 / 0.9) 100%)",
        border: "1px solid oklch(0.5 0.18 310 / 0.35)",
        boxShadow: "0 0 24px oklch(0.5 0.18 310 / 0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "oklch(0.5 0.18 310 / 0.2)" }}
        >
          <Camera size={20} style={{ color: "oklch(0.75 0.2 310)" }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p
              className="font-bold text-base"
              style={{ color: "oklch(0.82 0.16 310)" }}
            >
              Account Type
            </p>
            {isModel && (
              <span
                className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full tracking-wide"
                style={{
                  background: "oklch(0.3 0.15 310 / 0.5)",
                  color: "oklch(0.82 0.2 310)",
                  border: "1px solid oklch(0.55 0.2 310 / 0.5)",
                }}
              >
                MODEL
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: "oklch(0.55 0.08 310)" }}>
            Switch between enthusiast and model account
          </p>
        </div>
      </div>

      {/* Account type selector */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Car Enthusiast */}
        <button
          type="button"
          onClick={() => setIsModel(false)}
          className="rounded-xl p-3 flex flex-col items-center gap-2 transition-all"
          style={
            !isModel
              ? {
                  background: "oklch(0.22 0.06 50 / 0.5)",
                  border: "1.5px solid oklch(var(--orange) / 0.6)",
                  boxShadow: "0 0 12px oklch(var(--orange) / 0.15)",
                }
              : {
                  background: "oklch(var(--surface))",
                  border: "1.5px solid oklch(var(--border))",
                }
          }
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: !isModel
                ? "oklch(var(--orange) / 0.2)"
                : "oklch(var(--surface-elevated))",
            }}
          >
            <Car
              size={18}
              style={{
                color: !isModel
                  ? "oklch(var(--orange))"
                  : "oklch(var(--steel))",
              }}
            />
          </div>
          <span
            className="text-xs font-semibold text-center leading-tight"
            style={{
              color: !isModel
                ? "oklch(var(--orange-bright))"
                : "oklch(var(--steel))",
            }}
          >
            Car Enthusiast
          </span>
          {!isModel && (
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: "oklch(var(--orange))" }}
            >
              <Check size={9} color="black" />
            </div>
          )}
        </button>

        {/* Import Car Model */}
        <button
          type="button"
          onClick={() => setIsModel(true)}
          className="rounded-xl p-3 flex flex-col items-center gap-2 transition-all"
          style={
            isModel
              ? {
                  background: "oklch(0.22 0.1 310 / 0.4)",
                  border: "1.5px solid oklch(0.6 0.22 310 / 0.6)",
                  boxShadow: "0 0 12px oklch(0.6 0.22 310 / 0.15)",
                }
              : {
                  background: "oklch(var(--surface))",
                  border: "1.5px solid oklch(var(--border))",
                }
          }
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: isModel
                ? "oklch(0.6 0.22 310 / 0.2)"
                : "oklch(var(--surface-elevated))",
            }}
          >
            <Sparkles
              size={18}
              style={{
                color: isModel ? "oklch(0.72 0.2 310)" : "oklch(var(--steel))",
              }}
            />
          </div>
          <span
            className="text-xs font-semibold text-center leading-tight"
            style={{
              color: isModel ? "oklch(0.82 0.18 310)" : "oklch(var(--steel))",
            }}
          >
            Import Car Model
          </span>
          {isModel && (
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: "oklch(0.6 0.22 310)" }}
            >
              <Check size={9} color="white" />
            </div>
          )}
        </button>
      </div>

      {/* Model-specific fields */}
      {isModel && (
        <div className="space-y-4 mb-5">
          {/* Specialty dropdown */}
          <div>
            <label
              htmlFor="model-specialty"
              className="text-xs font-semibold uppercase tracking-wider mb-1.5 block"
              style={{ color: "oklch(0.6 0.08 310)" }}
            >
              Specialty
            </label>
            <select
              id="model-specialty"
              value={modelData.specialty}
              onChange={(e) =>
                setModelData((d) => ({ ...d, specialty: e.target.value }))
              }
              className="w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
              style={{
                background: "oklch(var(--surface))",
                border: "1px solid oklch(0.45 0.1 310 / 0.4)",
                color: "oklch(var(--foreground))",
              }}
            >
              {MODEL_SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Years Active */}
          <div>
            <label
              htmlFor="model-years-active"
              className="text-xs font-semibold uppercase tracking-wider mb-1.5 block"
              style={{ color: "oklch(0.6 0.08 310)" }}
            >
              Years Active
            </label>
            <input
              id="model-years-active"
              type="text"
              value={modelData.yearsActive}
              onChange={(e) =>
                setModelData((d) => ({ ...d, yearsActive: e.target.value }))
              }
              placeholder="e.g. 2019 – Present"
              className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-steel focus:outline-none"
              style={{
                background: "oklch(var(--surface))",
                border: "1px solid oklch(0.45 0.1 310 / 0.4)",
              }}
            />
          </div>

          {/* Instagram Handle */}
          <div>
            <label
              htmlFor="model-social-handle"
              className="text-xs font-semibold uppercase tracking-wider mb-1.5 block"
              style={{ color: "oklch(0.6 0.08 310)" }}
            >
              Instagram Handle
            </label>
            <input
              id="model-social-handle"
              type="text"
              value={modelData.socialHandle}
              onChange={(e) =>
                setModelData((d) => ({ ...d, socialHandle: e.target.value }))
              }
              placeholder="@yourusername"
              className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-steel focus:outline-none"
              style={{
                background: "oklch(var(--surface))",
                border: "1px solid oklch(0.45 0.1 310 / 0.4)",
              }}
            />
          </div>

          {/* Booking Contact */}
          <div>
            <label
              htmlFor="model-booking-contact"
              className="text-xs font-semibold uppercase tracking-wider mb-1.5 block"
              style={{ color: "oklch(0.6 0.08 310)" }}
            >
              Booking Contact
            </label>
            <input
              id="model-booking-contact"
              type="text"
              value={modelData.bookingContact}
              onChange={(e) =>
                setModelData((d) => ({ ...d, bookingContact: e.target.value }))
              }
              placeholder="Email or phone for bookings"
              className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-steel focus:outline-none"
              style={{
                background: "oklch(var(--surface))",
                border: "1px solid oklch(0.45 0.1 310 / 0.4)",
              }}
            />
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.58 0.22 310) 0%, oklch(0.5 0.2 300) 100%)",
          color: "white",
          boxShadow: "0 4px 20px oklch(0.58 0.22 310 / 0.3)",
        }}
      >
        <Camera size={14} />
        Save Account Type
      </button>
    </div>
  );
}

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
  const { identity } = useInternetIdentity();
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
    } else if (!profile && !initialized && identity) {
      // Backend is still loading or returned empty — try the local cache so the
      // form isn't blank while we wait for the canister to respond.
      const principalId = identity.getPrincipal().toString();
      const cached = getCachedProfile(principalId);
      if (cached?.displayName) {
        setForm({
          displayName: cached.displayName,
          bio: cached.bio ?? "",
          avatarUrl: cached.avatarUrl ?? "",
          bannerUrl: cached.bannerUrl ?? "",
          location: cached.location ?? "",
        });
        // Don't set initialized=true here: when the real backend profile
        // arrives we'll overwrite the form with the authoritative data.
      }
    }
  }, [profile, initialized, identity]);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    file = await convertToJpegIfNeeded(file);

    // Pre-upload validation: size + MIME only (no duration for images)
    const validation = await validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error ?? "File validation failed.", {
        duration: 8000,
      });
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }
    if (validation.warning) {
      toast.warning(validation.warning, { duration: 6000 });
    }

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
    file = await convertToJpegIfNeeded(file);

    // Pre-upload validation: size + MIME only (no duration for images)
    const validation = await validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error ?? "File validation failed.", {
        duration: 8000,
      });
      if (bannerInputRef.current) bannerInputRef.current.value = "";
      return;
    }
    if (validation.warning) {
      toast.warning(validation.warning, { duration: 6000 });
    }

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
          accept="image/*,.heic,.heif,.webp"
          className="hidden"
          onChange={handleAvatarFile}
        />
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*,.heic,.heif,.webp"
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

        {/* Model Account section */}
        <ModelAccountCard />
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
