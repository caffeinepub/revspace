import { useState, useRef, useCallback } from "react";
import { Image, Video, Film, X, Loader2, Upload, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreatePost, useUploadFile } from "../hooks/useQueries";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

const POST_TYPES = [
  { value: "Photo", icon: Image, label: "Photo", accept: "image/*" },
  { value: "Video", icon: Video, label: "Video", accept: "video/*" },
  { value: "Reel", icon: Film, label: "Reel", accept: "video/*" },
];

export function CreatePostPage() {
  const navigate = useNavigate();
  const [postType, setPostType] = useState("Photo");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();
  const uploadFile = useUploadFile();

  const currentType = POST_TYPES.find((t) => t.value === postType)!;
  const isVideo = postType === "Video" || postType === "Reel";

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Revoke previous preview URL
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setUploadProgress(null);
  }, [previewUrl]);

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
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const url = await uploadFile(file, (pct) => setUploadProgress(pct));
        mediaUrls = [url];
      } catch {
        toast.error("Failed to upload media");
        setIsUploading(false);
        setUploadProgress(null);
        return;
      }
      setIsUploading(false);
      setUploadProgress(null);
    }

    createPost.mutate(
      {
        content: content.trim(),
        mediaUrls,
        postType,
      },
      {
        onSuccess: () => {
          toast.success("Post published! 🔥");
          clearFile();
          void navigate({ to: "/" });
        },
        onError: () => toast.error("Failed to publish post"),
      }
    );
  };

  const isBusy = isUploading || createPost.isPending;

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <h1 className="font-display text-2xl font-bold">Create Post</h1>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { clearFile(); void navigate({ to: "/" }); }}
          className="text-steel hover:text-foreground"
        >
          <X size={18} />
        </Button>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-5 max-w-xl mx-auto">
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
                onClick={() => { setPostType(value); clearFile(); }}
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

        {/* Media Upload */}
        <div>
          <Label className="text-xs text-steel mb-2 block uppercase tracking-wider font-semibold">
            Media {postType === "Photo" ? "(Image)" : "(Video)"}
          </Label>

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
                  style={{ background: "oklch(var(--orange) / 0.1)", border: "1px solid oklch(var(--orange) / 0.3)" }}
                >
                  <ImagePlus size={26} style={{ color: "oklch(var(--orange))" }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">
                    {isVideo ? "Upload Video" : "Upload Photo"}
                  </p>
                  <p className="text-xs text-steel mt-0.5">
                    Tap to browse {isVideo ? "videos" : "images"} from your device
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Upload Progress */}
          {uploadProgress !== null && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-steel">Uploading...</span>
                <span className="text-xs font-semibold" style={{ color: "oklch(var(--orange))" }}>
                  {Math.round(uploadProgress)}%
                </span>
              </div>
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
            </div>
          )}

          {/* Browse button when file already selected */}
          {previewUrl && (
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
          <Label className="text-xs text-steel mb-2 block uppercase tracking-wider font-semibold">
            Caption *
          </Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your build story, mod list, or weekend drive..."
            className="min-h-[120px] resize-none text-sm"
            style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--border))" }}
            maxLength={2000}
          />
          <p className="text-[11px] text-steel text-right mt-1">{content.length}/2000</p>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isBusy || !content.trim()}
          className="w-full h-12 text-base font-bold rounded-xl"
          style={{
            background: isBusy || !content.trim()
              ? "oklch(var(--surface-elevated))"
              : "oklch(var(--orange))",
            color: isBusy || !content.trim()
              ? "oklch(var(--steel-light))"
              : "oklch(var(--carbon))",
            boxShadow: !isBusy && content.trim()
              ? "0 0 30px oklch(var(--orange) / 0.3)"
              : "none",
          }}
        >
          {isUploading ? (
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Uploading media...
            </div>
          ) : createPost.isPending ? (
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Publishing...
            </div>
          ) : (
            "Publish Post 🔥"
          )}
        </Button>
      </form>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-steel border-t border-border mt-4">
        © 2026. Built with ❤️ using{" "}
        <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="text-orange hover:underline">
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
