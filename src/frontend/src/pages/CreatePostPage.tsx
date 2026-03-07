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
import { uploadVideoInChunks } from "../lib/videoChunker";
import {
  compressVideoIfNeeded,
  generateVideoThumbnail,
} from "../lib/videoProcessor";

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
// Added "compressing" stage between validating and uploading
type UploadStage =
  | "idle"
  | "validating"
  | "compressing"
  | "thumbnail"
  | "uploading"
  | "publishing";

interface StagePill {
  label: string;
  progress?: number;
}

function getStageInfo(
  stage: UploadStage,
  progress: number | null,
): StagePill | null {
  if (stage === "idle") return null;
  if (stage === "validating") return { label: "Validating..." };
  if (stage === "compressing")
    return {
      label: `Compressing... ${Math.round(progress ?? 0)}%`,
      progress: progress ?? 0,
    };
  if (stage === "thumbnail") return { label: "Generating thumbnail..." };
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

  const isModelOnlySection =
    new URLSearchParams(window.location.search).get("modelOnly") === "1";

  const [postType, setPostType] = useState("Photo");
  const [topic, setTopic] = useState("Other");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [stage, setStage] = useState<UploadStage>("idle");

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

  // ── Draft autosave ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!principalId || !content.trim()) return;

    if (draftAutosaveTimer.current) {
      clearTimeout(draftAutosaveTimer.current);
    }

    draftAutosaveTimer.current = setTimeout(() => {
      saveDraft(principalId, { content, postType, topic });
      setDraftSavedAt(Date.now());
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

  // ── File change handler — now also generates thumbnail for videos ───────────
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      let selected = e.target.files?.[0];
      if (!selected) return;

      // Convert HEIC/HEIF/WebP to JPEG for images
      if (!selected.type.startsWith("video/")) {
        selected = await convertToJpegIfNeeded(selected);
      }

      // Revoke previous preview URL
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      setFile(selected);
      setThumbnailDataUrl(null);
      const objectUrl = URL.createObjectURL(selected);
      setPreviewUrl(objectUrl);
      setUploadProgress(null);

      // Pre-selection validation
      const opts: FileValidationOptions = {
        postType: postType as "Photo" | "Video" | "Reel",
      };
      const result = await validateFile(selected, opts);
      if (result.warning) {
        toast.warning(result.warning, { duration: 6000 });
      }
      if (!result.valid && result.error) {
        toast.error(result.error, { duration: 8000 });
        URL.revokeObjectURL(objectUrl);
        setFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Auto-generate thumbnail for video uploads so the feed loads faster
      if (selected.type.startsWith("video/")) {
        try {
          const thumbDataUrl = await generateVideoThumbnail(selected);
          setThumbnailDataUrl(thumbDataUrl);
        } catch {
          // Thumbnail generation failed — continue without it
        }
      }
    },
    [previewUrl, postType],
  );

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setThumbnailDataUrl(null);
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
      // ── Stage 1: Validate ──────────────────────────────────────────────────
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

      // ── Stage 2: Compress video (if needed) ───────────────────────────────
      let fileToUpload = file;
      if (isVideo) {
        setStage("compressing");
        setUploadProgress(0);
        try {
          fileToUpload = await compressVideoIfNeeded(file, {
            maxHeightPx: 720,
            onProgress: setUploadProgress,
          });
        } catch {
          // Compression failed — fall back to original file silently
          fileToUpload = file;
        }
        setUploadProgress(null);
      }

      // ── Stage 3: Generate / upload thumbnail for videos ───────────────────
      let thumbnailUploadUrl: string | null = null;
      if (isVideo) {
        setStage("thumbnail");
        try {
          // Use already-generated thumbnailDataUrl or generate fresh
          let thumbDataUrl = thumbnailDataUrl;
          if (!thumbDataUrl) {
            thumbDataUrl = await generateVideoThumbnail(fileToUpload);
          }

          // Convert data URL to Blob
          const fetchedBlob = await fetch(thumbDataUrl).then((r) => r.blob());
          const thumbFile = new File([fetchedBlob], "thumbnail.jpg", {
            type: "image/jpeg",
          });

          // Upload thumbnail using uploadFile hook
          const uploadStart = Date.now();
          try {
            thumbnailUploadUrl = await uploadFile(thumbFile);
            recordUploadAttempt({
              timestamp: uploadStart,
              success: true,
              fileSizeMB: thumbFile.size / (1024 * 1024),
            });
          } catch {
            // Thumbnail upload failed — proceed without it
            thumbnailUploadUrl = null;
          }
        } catch {
          // Thumbnail gen/upload failed — continue without thumbnail
          thumbnailUploadUrl = null;
        }
      }

      // ── Stage 4: Upload main file ─────────────────────────────────────────
      setStage("uploading");
      setUploadProgress(0);

      const uploadStart = Date.now();
      try {
        let videoUrl: string;

        if (isVideo) {
          // Use chunked upload for videos (provides granular progress)
          videoUrl = await uploadVideoInChunks(
            fileToUpload,
            (blob, filename, mimeType) =>
              uploadFile(
                blob instanceof File
                  ? blob
                  : new File([blob], filename ?? "video.mp4", {
                      type: mimeType ?? fileToUpload.type,
                    }),
              ),
            setUploadProgress,
          );
        } else {
          videoUrl = await uploadFile(fileToUpload, (pct) =>
            setUploadProgress(pct),
          );
        }

        // Build mediaUrls: [videoUrl, thumbnailUrl] or just [imageUrl]
        if (isVideo && thumbnailUploadUrl) {
          mediaUrls = [videoUrl, thumbnailUploadUrl];
        } else {
          mediaUrls = [videoUrl];
        }

        recordUploadAttempt({
          timestamp: uploadStart,
          success: true,
          fileSizeMB: fileToUpload.size / (1024 * 1024),
        });
      } catch (err) {
        const errorType = err instanceof Error ? err.message : String(err);
        const friendlyMessage = mapErrorMessage(err);

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

    // ── Stage 5: Publish ───────────────────────────────────────────────────
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

          if (principalId) {
            awardPostCreation(principalId);
            toast.success("+10 RevBucks earned! ⚡", { duration: 3000 });
          }

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
                    <>
                      {/* Show thumbnail as preview if available, else show video */}
                      {thumbnailDataUrl ? (
                        <div className="relative">
                          <img
                            src={thumbnailDataUrl}
                            alt="Video thumbnail preview"
                            className="w-full h-52 object-cover"
                          />
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ background: "oklch(0 0 0 / 0.3)" }}
                          >
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center"
                              style={{ background: "oklch(0 0 0 / 0.6)" }}
                            >
                              <Film size={22} className="text-white" />
                            </div>
                          </div>
                          <div
                            className="absolute bottom-0 left-0 right-0 px-2 py-1"
                            style={{ background: "oklch(var(--orange) / 0.9)" }}
                          >
                            <p
                              className="text-[10px] font-semibold text-center"
                              style={{ color: "oklch(var(--carbon))" }}
                            >
                              Thumbnail generated ✓
                            </p>
                          </div>
                        </div>
                      ) : (
                        <video
                          src={previewUrl}
                          className="w-full h-52 object-cover"
                          controls
                          playsInline
                        >
                          <track kind="captions" />
                        </video>
                      )}
                    </>
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
                      style={{
                        background: "oklch(0 0 0 / 0.5)",
                        // Only show file info overlay when no thumbnail banner is showing
                        display: thumbnailDataUrl && isVideo ? "none" : "block",
                      }}
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
                  data-ocid="create_post.upload_button"
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
                        ? "Up to 10 minutes · MP4/MOV recommended · Thumbnail auto-generated"
                        : `Tap to browse ${isVideo ? "videos" : "images"} from your device`}
                    </p>
                  </div>
                </button>
              )}
            </div>

            {/* Multi-stage upload progress indicator */}
            {stageInfo && (
              <div
                data-ocid="create_post.loading_state"
                className="mt-2 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background:
                        stage === "compressing"
                          ? "oklch(0.6 0.18 260)"
                          : "oklch(var(--orange))",
                      color: "oklch(var(--carbon))",
                    }}
                  >
                    {stage === "publishing" && (
                      <CheckCircle2 size={11} className="opacity-80" />
                    )}
                    {(stage === "uploading" ||
                      stage === "validating" ||
                      stage === "compressing" ||
                      stage === "thumbnail") && (
                      <Loader2 size={11} className="animate-spin opacity-80" />
                    )}
                    {stageInfo.label}
                  </span>
                  {(stage === "uploading" || stage === "compressing") &&
                    uploadProgress !== null && (
                      <span
                        className="text-xs font-semibold"
                        style={{ color: "oklch(var(--orange))" }}
                      >
                        {Math.round(uploadProgress)}%
                      </span>
                    )}
                </div>

                {/* Progress bar — during upload and compression */}
                {(stage === "uploading" || stage === "compressing") &&
                  uploadProgress !== null && (
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "oklch(var(--surface-elevated))" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${uploadProgress}%`,
                          background:
                            stage === "compressing"
                              ? "oklch(0.6 0.18 260)"
                              : "oklch(var(--orange))",
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
                data-ocid="create_post.upload_button"
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
            data-ocid="create_post.submit_button"
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
            ) : stage === "compressing" ? (
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Compressing video...
              </div>
            ) : stage === "thumbnail" ? (
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Generating thumbnail...
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
