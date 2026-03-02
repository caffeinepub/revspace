import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Film,
  Image,
  ImagePlus,
  Loader2,
  RotateCcw,
  Settings,
  Tag,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UploadHealthBanner } from "../components/UploadHealthBanner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useCreatePost, useUploadFile } from "../hooks/useQueries";
import { useUserMeta } from "../hooks/useUserMeta";
import { convertToJpegIfNeeded } from "../lib/convertHeic";
import { clearDraft, getDraft, hasDraft, saveDraft } from "../lib/draftPost";
import { awardPostCreation } from "../lib/revbucks";
import { recordUploadAttempt } from "../lib/uploadHealth";
import {
  type FileValidationOptions,
  validateFile,
} from "../lib/uploadValidator";

// Explicit extensions alongside the MIME wildcard so iOS Safari and Android
// WebView both show video files in the native picker correctly.
const VIDEO_ACCEPT = "video/*,.mov,.mkv,.mp4,.avi,.webm";

const POST_TYPES = [
  {
    value: "Photo",
    icon: Image,
    label: "Photo",
    accept: "image/*,.heic,.heif,.webp",
  },
  { value: "Video", icon: Video, label: "Video", accept: VIDEO_ACCEPT },
  { value: "Reel", icon: Film, label: "Reel", accept: VIDEO_ACCEPT },
];

const REEL_TOPICS = [
  "Street Drift",
  "Car Show",
  "Track Day",
  "Burnout",
  "Stance",
  "JDM Build",
  "Muscle",
  "Import",
  "Cars & Coffee",
  "Other",
];

// ── Upload stages ────────────────────────────────────────────────────────────
type UploadStage = "idle" | "validating" | "uploading" | "publishing";

interface StagePill {
  label: string;
  progress?: number; // 0-100, only shown in "uploading" stage
}

function getStageInfo(
  stage: UploadStage,
  progress: number | null,
): StagePill | null {
  if (stage === "idle") return null;
  if (stage === "validating") return { label: "Validating..." };
  if (stage === "uploading")
    return {
      label: `Uploading... ${Math.round(progress ?? 0)}%`,
      progress: progress ?? 0,
    };
  if (stage === "publishing") return { label: "Publishing..." };
  return null;
}

// ── Actionable error mapper ──────────────────────────────────────────────────
function mapErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes("log in") || lower.includes("identity")) {
    return "You need to be logged in. Tap the login button and try again.";
  }
  if (
    lower.includes("v3") ||
    lower.includes("certificate") ||
    lower.includes("expected v3")
  ) {
    return "Upload ran into a sync issue — retrying automatically. If it keeps failing, try refreshing the page.";
  }
  if (lower.includes("size") || lower.includes("mb")) {
    return "File is too large. Try compressing or trimming it before uploading.";
  }
  if (
    lower.includes("format") ||
    lower.includes("mime") ||
    lower.includes("type")
  ) {
    return "This file format isn't supported. Try MP4 for video or JPEG/PNG for photos.";
  }
  if (
    lower.includes("network") ||
    lower.includes("timeout") ||
    lower.includes("fetch")
  ) {
    return "Upload interrupted. Keep this tab open and try again — your caption is saved.";
  }
  if (lower.includes("rate limit")) {
    return "You're posting too fast. Wait a minute and try again.";
  }
  return `Upload failed: ${msg}`;
}

export function CreatePostPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toText() ?? "";
  const { meta, isLoading: metaLoading } = useUserMeta();

  // Check if this page was opened from a model-only section
  const isModelOnlySection =
    new URLSearchParams(window.location.search).get("modelOnly") === "1";

  const [postType, setPostType] = useState("Photo");
  const [topic, setTopic] = useState("Other");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [stage, setStage] = useState<UploadStage>("idle");

  // Draft state
  const [draftBannerVisible, setDraftBannerVisible] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const draftAutosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();
  const uploadFile = useUploadFile();

  const currentType = POST_TYPES.find((t) => t.value === postType)!;
  const isVideo = postType === "Video" || postType === "Reel";

  // ── On mount: check for saved draft ────────────────────────────────────────
  useEffect(() => {
    if (!principalId) return;
    if (hasDraft(principalId)) {
      setDraftBannerVisible(true);
    }
  }, [principalId]);

  // ── Draft autosave — debounced 1500ms on content/topic change ──────────────
  useEffect(() => {
    if (!principalId || !content.trim()) return;

    if (draftAutosaveTimer.current) {
      clearTimeout(draftAutosaveTimer.current);
    }

    draftAutosaveTimer.current = setTimeout(() => {
      saveDraft(principalId, { content, postType, topic });
      setDraftSavedAt(Date.now());
      // Fade out the indicator after 2.5 seconds
      setTimeout(() => setDraftSavedAt(null), 2500);
    }, 1500);

    return () => {
      if (draftAutosaveTimer.current) {
        clearTimeout(draftAutosaveTimer.current);
      }
    };
  }, [content, postType, topic, principalId]);

  // ── Restore draft ───────────────────────────────────────────────────────────
  const handleRestoreDraft = () => {
    if (!principalId) return;
    const draft = getDraft(principalId);
    if (!draft) return;
    setContent(draft.content);
    setPostType(draft.postType);
    setTopic(draft.topic);
    setDraftBannerVisible(false);
  };

  const handleDismissDraft = () => {
    setDraftBannerVisible(false);
    if (principalId) clearDraft(principalId);
  };

  // ── File change handler ─────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      let selected = e.target.files?.[0];
      if (!selected) return;

      // Step 1: Convert HEIC/HEIF/WebP to JPEG
      if (!selected.type.startsWith("video/")) {
        selected = await convertToJpegIfNeeded(selected);
      }

      // Revoke previous preview URL
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      setFile(selected);
      const objectUrl = URL.createObjectURL(selected);
      setPreviewUrl(objectUrl);
      setUploadProgress(null);

      // Step 2: Run pre-selection validation (warnings only — no blocking here)
      const opts: FileValidationOptions = {
        postType: postType as "Photo" | "Video" | "Reel",
      };
      const result = await validateFile(selected, opts);
      if (result.warning) {
        toast.warning(result.warning, { duration: 6000 });
      }
      if (!result.valid && result.error) {
        // Validation failed — show error and clear the file
        toast.error(result.error, { duration: 8000 });
        URL.revokeObjectURL(objectUrl);
        setFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [previewUrl, postType],
  );

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Please add some content");
      return;
    }

    let mediaUrls: string[] = [];

    if (file) {
      // ── Stage 1: Validate ────────────────────────────────────────────────
      setStage("validating");
      const opts: FileValidationOptions = {
        postType: postType as "Photo" | "Video" | "Reel",
      };
      const validation = await validateFile(file, opts);

      if (!validation.valid) {
        toast.error(validation.error ?? "File validation failed.", {
          duration: 8000,
        });
        setStage("idle");
        return;
      }
      if (validation.warning) {
        toast.warning(validation.warning, { duration: 6000 });
      }

      // ── Stage 2: Upload ──────────────────────────────────────────────────
      setStage("uploading");
      setUploadProgress(0);

      const uploadStart = Date.now();
      try {
        const url = await uploadFile(file, (pct) => setUploadProgress(pct));
        mediaUrls = [url];

        // Record successful upload
        recordUploadAttempt({
          timestamp: Date.now(),
          success: true,
          fileSizeMB: file.size / (1024 * 1024),
        });
      } catch (err) {
        const errorType = err instanceof Error ? err.message : String(err);
        const friendlyMessage = mapErrorMessage(err);

        // Record failed upload
        recordUploadAttempt({
          timestamp: uploadStart,
          success: false,
          errorType,
        });

        toast.error(friendlyMessage, { duration: 8000 });
        setStage("idle");
        setUploadProgress(null);
        return;
      }

      setUploadProgress(null);
    }

    // ── Stage 3: Publish ───────────────────────────────────────────────────
    setStage("publishing");
    const isReelOrVideo = postType === "Reel" || postType === "Video";

    createPost.mutate(
      {
        content: content.trim(),
        mediaUrls,
        postType,
        topic: isReelOrVideo ? topic : "",
      },
      {
        onSuccess: () => {
          toast.success("Post published! 🔥");

          // Award RevBucks for creating a post
          if (principalId) {
            awardPostCreation(principalId);
            toast.success("+10 RevBucks earned! ⚡", { duration: 3000 });
          }

          // Clear draft on successful publish
          if (principalId) clearDraft(principalId);

          clearFile();
          setContent("");
          setStage("idle");
          void navigate({ to: "/" });
        },
        onError: (err) => {
          const friendlyMessage = mapErrorMessage(err);
          toast.error(friendlyMessage, { duration: 8000 });
          setStage("idle");
        },
      },
    );
  };

  const isBusy = stage !== "idle" || createPost.isPending;
  const stageInfo = getStageInfo(stage, uploadProgress);

  // Model-only gate: if opened from model section and user is not a model account
  const showModelGate = isModelOnlySection && !metaLoading && !meta.isModel;

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <h1 className="font-display text-2xl font-bold">Create Post</h1>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            clearFile();
            void navigate({ to: "/" });
          }}
          className="text-steel hover:text-foreground"
        >
          <X size={18} />
        </Button>
      </header>

      {/* Model-only section gate */}
      {showModelGate && (
        <div className="p-4 max-w-xl mx-auto">
          <div
            className="rounded-2xl p-6 flex flex-col items-center text-center gap-4"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.14 0.06 310 / 0.6), oklch(0.11 0.03 310 / 0.9))",
              border: "1px solid oklch(0.45 0.14 310 / 0.6)",
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "oklch(0.3 0.15 310 / 0.4)" }}
            >
              <span className="text-3xl">🎬</span>
            </div>
            <div>
              <p
                className="text-lg font-black mb-1"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: "0.04em",
                  color: "oklch(0.92 0.14 310)",
                }}
              >
                Model Accounts Only
              </p>
              <p className="text-sm" style={{ color: "oklch(0.65 0.1 310)" }}>
                This section is exclusively for model accounts. Switch to a
                Model Account in Settings to post here.
              </p>
            </div>
            <Link to="/settings">
              <Button
                className="flex items-center gap-2 font-semibold"
                style={{
                  background: "oklch(0.55 0.22 310)",
                  color: "white",
                  border: "none",
                  boxShadow: "0 0 20px oklch(0.55 0.22 310 / 0.4)",
                }}
              >
                <Settings size={15} />
                Go to Settings
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void navigate({ to: "/" })}
              className="text-steel"
            >
              Back to Feed
            </Button>
          </div>
        </div>
      )}

      {!showModelGate && (
        <form
          onSubmit={handleSubmit}
          className="p-4 space-y-5 max-w-xl mx-auto"
        >
          {/* Draft restore banner */}
          {draftBannerVisible && (
            <div
              className="flex items-center gap-3 rounded-xl px-3.5 py-3"
              style={{
                background: "oklch(0.2 0.06 260 / 0.3)",
                border: "1px solid oklch(0.55 0.18 260 / 0.4)",
              }}
            >
              <RotateCcw
                size={15}
                className="shrink-0"
                style={{ color: "oklch(0.7 0.18 260)" }}
              />
              <p
                className="text-xs flex-1"
                style={{ color: "oklch(0.82 0.08 260)" }}
              >
                You have a saved draft
              </p>
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="text-xs font-semibold px-2 py-1 rounded-lg transition-opacity hover:opacity-80"
                style={{
                  background: "oklch(0.55 0.2 260 / 0.3)",
                  color: "oklch(0.78 0.2 260)",
                  border: "1px solid oklch(0.55 0.2 260 / 0.4)",
                }}
              >
                Restore
              </button>
              <button
                type="button"
                onClick={handleDismissDraft}
                className="text-steel hover:text-foreground transition-colors ml-1"
                aria-label="Dismiss draft"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Post Type Selector */}
          <div>
            <Label className="text-xs text-steel mb-2 block uppercase tracking-wider font-semibold">
              Post Type
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {POST_TYPES.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setPostType(value);
                    clearFile();
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                  style={
                    postType === value
                      ? {
                          background: "oklch(var(--orange) / 0.15)",
                          border: "2px solid oklch(var(--orange))",
                          color: "oklch(var(--orange-bright))",
                        }
                      : {
                          background: "oklch(var(--surface))",
                          border: "2px solid oklch(var(--border))",
                          color: "oklch(var(--steel-light))",
                        }
                  }
                >
                  <Icon size={22} />
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Topic Selector — only for Reel/Video */}
          {(postType === "Reel" || postType === "Video") && (
            <div>
              <Label className="text-xs text-steel mb-2 block uppercase tracking-wider font-semibold">
                <span className="flex items-center gap-1.5">
                  <Tag size={12} />
                  Topic / Category
                </span>
              </Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger
                  className="h-11 text-sm font-medium"
                  style={{
                    background: "oklch(var(--surface))",
                    borderColor: "oklch(var(--border))",
                    color: "oklch(var(--foreground))",
                  }}
                >
                  <SelectValue placeholder="Select a topic..." />
                </SelectTrigger>
                <SelectContent
                  style={{
                    background: "oklch(var(--surface))",
                    borderColor: "oklch(var(--border))",
                  }}
                >
                  {REEL_TOPICS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-steel mt-1">
                Help others find your reel by tagging it with a topic
              </p>
            </div>
          )}

          {/* Media Upload */}
          <div>
            <Label className="text-xs text-steel mb-2 block uppercase tracking-wider font-semibold">
              Media {postType === "Photo" ? "(Image)" : "(Video)"}
            </Label>

            {/* Upload health warning banner */}
            <UploadHealthBanner />

            <input
              ref={fileInputRef}
              type="file"
              accept={currentType.accept}
              className="hidden"
              onChange={handleFileChange}
            />

            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                border: "2px dashed oklch(var(--border))",
                minHeight: "160px",
                background: "oklch(var(--surface))",
              }}
            >
              {previewUrl ? (
                <div className="relative">
                  {isVideo ? (
                    <video
                      src={previewUrl}
                      className="w-full h-52 object-cover"
                      controls
                      playsInline
                    >
                      <track kind="captions" />
                    </video>
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-52 object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={clearFile}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "oklch(0 0 0 / 0.6)" }}
                  >
                    <X size={14} className="text-white" />
                  </button>
                  {file && (
                    <div
                      className="absolute bottom-0 left-0 right-0 px-3 py-2"
                      style={{ background: "oklch(0 0 0 / 0.5)" }}
                    >
                      <p className="text-white text-xs truncate">{file.name}</p>
                      <p className="text-white/60 text-[10px]">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center py-10 gap-3 hover:opacity-80 transition-opacity"
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background: "oklch(var(--orange) / 0.1)",
                      border: "1px solid oklch(var(--orange) / 0.3)",
                    }}
                  >
                    <ImagePlus
                      size={26}
                      style={{ color: "oklch(var(--orange))" }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {isVideo ? "Upload Video" : "Upload Photo"}
                    </p>
                    <p className="text-xs text-steel mt-0.5">
                      {postType === "Reel"
                        ? "Up to 10 minutes · MP4/MOV recommended"
                        : `Tap to browse ${isVideo ? "videos" : "images"} from your device`}
                    </p>
                  </div>
                </button>
              )}
            </div>

            {/* Multi-stage upload progress indicator */}
            {stageInfo && (
              <div className="mt-2 space-y-1.5">
                {/* Stage pill */}
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background: "oklch(var(--orange))",
                      color: "oklch(var(--carbon))",
                    }}
                  >
                    {stage === "publishing" && (
                      <CheckCircle2 size={11} className="opacity-80" />
                    )}
                    {(stage === "uploading" || stage === "validating") && (
                      <Loader2 size={11} className="animate-spin opacity-80" />
                    )}
                    {stageInfo.label}
                  </span>
                  {stage === "uploading" && uploadProgress !== null && (
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "oklch(var(--orange))" }}
                    >
                      {Math.round(uploadProgress)}%
                    </span>
                  )}
                </div>

                {/* Progress bar — only during upload */}
                {stage === "uploading" && uploadProgress !== null && (
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "oklch(var(--surface-elevated))" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${uploadProgress}%`,
                        background: "oklch(var(--orange))",
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Browse button when file already selected */}
            {previewUrl && !isBusy && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex items-center gap-1.5 text-xs text-steel hover:text-foreground transition-colors"
              >
                <Upload size={12} />
                Change file
              </button>
            )}
          </div>

          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-steel uppercase tracking-wider font-semibold">
                Caption *
              </Label>
              {/* Draft saved indicator */}
              {draftSavedAt && (
                <span
                  className="text-[10px] flex items-center gap-1 transition-opacity"
                  style={{ color: "oklch(0.65 0.14 150)" }}
                >
                  <CheckCircle2 size={10} />
                  Draft saved
                </span>
              )}
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your build story, mod list, or weekend drive..."
              className="min-h-[120px] resize-none text-sm"
              style={{
                background: "oklch(var(--surface))",
                borderColor: "oklch(var(--border))",
              }}
              maxLength={2000}
            />
            <p className="text-[11px] text-steel text-right mt-1">
              {content.length}/2000
            </p>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isBusy || !content.trim()}
            className="w-full h-12 text-base font-bold rounded-xl"
            style={{
              background:
                isBusy || !content.trim()
                  ? "oklch(var(--surface-elevated))"
                  : "oklch(var(--orange))",
              color:
                isBusy || !content.trim()
                  ? "oklch(var(--steel-light))"
                  : "oklch(var(--carbon))",
              boxShadow:
                !isBusy && content.trim()
                  ? "0 0 30px oklch(var(--orange) / 0.3)"
                  : "none",
            }}
          >
            {stage === "validating" ? (
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Validating...
              </div>
            ) : stage === "uploading" ? (
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Uploading media...
              </div>
            ) : stage === "publishing" || createPost.isPending ? (
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Publishing...
              </div>
            ) : (
              "Publish Post 🔥"
            )}
          </Button>
        </form>
      )}

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-steel border-t border-border mt-4">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
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
