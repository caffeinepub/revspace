/**
 * Client-side file validation before any upload bytes are sent.
 * Run this AFTER convertToJpegIfNeeded() but BEFORE calling uploadFile().
 */

export interface ValidationResult {
  valid: boolean;
  /** User-facing reason if invalid — includes what to do next */
  error?: string;
  /** Non-blocking advice (aspect ratio, large file, etc.) */
  warning?: string;
}

export interface FileValidationOptions {
  /** Adds reel-specific duration + aspect ratio checks */
  postType?: "Photo" | "Video" | "Reel";
}

const IMAGE_MAX_MB = 50;
const IMAGE_WARN_MB = 20;
const VIDEO_MAX_MB = 500;
const VIDEO_WARN_MB = 200;
const REEL_MAX_DURATION_SECONDS = 600; // 10 minutes
const REEL_ASPECT_RATIO_THRESHOLD = 0.6; // width / height < 0.6 = roughly 9:16

/** Load video metadata from a File using a temporary <video> element. */
function loadVideoMetadata(
  file: File,
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const result = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      cleanup();
      resolve(result);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read video metadata"));
    };

    // Timeout fallback — if metadata never fires, resolve with unknown values
    const timer = setTimeout(() => {
      cleanup();
      resolve({ duration: 0, width: 0, height: 0 });
    }, 8000);

    video.onloadedmetadata = () => {
      clearTimeout(timer);
      const result = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      cleanup();
      resolve(result);
    };

    video.src = objectUrl;
  });
}

export async function validateFile(
  file: File,
  opts?: FileValidationOptions,
): Promise<ValidationResult> {
  const fileSizeMB = file.size / (1024 * 1024);
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  const postType = opts?.postType;

  // ── MIME type checks ────────────────────────────────────────────────────────

  // After HEIC→JPEG conversion, any remaining non-image type in a Photo slot
  // is unsupported.
  if (postType === "Photo") {
    if (!isImage) {
      return {
        valid: false,
        error:
          "This file doesn't look like an image. Try a JPEG, PNG, or HEIC photo instead.",
      };
    }
  }

  // In a Video or Reel slot, reject non-video files
  if (postType === "Video" || postType === "Reel") {
    if (!isVideo) {
      return {
        valid: false,
        error:
          "This file isn't a video. Try an MP4 or MOV file for videos and reels.",
      };
    }
  }

  // If no postType provided, use MIME heuristic
  if (!postType) {
    if (!isVideo && !isImage) {
      return {
        valid: false,
        error:
          "Unsupported file format. Use JPEG or PNG for photos and MP4 or MOV for videos.",
      };
    }
  }

  // ── MKV warning ─────────────────────────────────────────────────────────────
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "mkv" || file.type === "video/x-matroska") {
    return {
      valid: true,
      warning:
        "MKV files may not play in all browsers. Converting to MP4 first will give the best results.",
    };
  }

  // ── Image size checks ───────────────────────────────────────────────────────
  if (isImage) {
    if (fileSizeMB > IMAGE_MAX_MB) {
      return {
        valid: false,
        error: `Image is too large (${fileSizeMB.toFixed(0)} MB). Maximum is ${IMAGE_MAX_MB} MB. Try compressing it first or use a lower-resolution export.`,
      };
    }
    if (fileSizeMB > IMAGE_WARN_MB) {
      return {
        valid: true,
        warning: `Large image (${fileSizeMB.toFixed(0)} MB). Upload may be slow — consider compressing it for faster results.`,
      };
    }
    return { valid: true };
  }

  // ── Video size checks ───────────────────────────────────────────────────────
  if (isVideo) {
    if (fileSizeMB > VIDEO_MAX_MB) {
      return {
        valid: false,
        error: `Video is too large (${fileSizeMB.toFixed(0)} MB). Maximum is ${VIDEO_MAX_MB} MB. Try trimming or compressing the video.`,
      };
    }

    if (fileSizeMB > VIDEO_WARN_MB) {
      // Still do duration/aspect checks before returning the warning
      // Fall through to reel checks below
    }

    // ── Reel-specific checks ─────────────────────────────────────────────────
    if (postType === "Reel") {
      try {
        const meta = await loadVideoMetadata(file);

        if (meta.duration > REEL_MAX_DURATION_SECONDS) {
          return {
            valid: true,
            warning: `Reel is ${Math.round(meta.duration / 60)} minutes long — reels over 10 minutes may be slow to process. Trim it down for faster uploads.`,
          };
        }

        if (
          meta.width > 0 &&
          meta.height > 0 &&
          meta.width / meta.height > REEL_ASPECT_RATIO_THRESHOLD
        ) {
          // It's wider than 9:16 — warn but don't block
          const aspectWarning = `Video appears to be wider than portrait (${meta.width}×${meta.height}). Reels look best at 9:16 (vertical). You can still upload, but it may be cropped.`;
          if (fileSizeMB > VIDEO_WARN_MB) {
            return {
              valid: true,
              warning: `Large reel (${fileSizeMB.toFixed(0)} MB) — keep this tab open during upload. ${aspectWarning}`,
            };
          }
          return { valid: true, warning: aspectWarning };
        }
      } catch {
        // Metadata load failed — proceed without duration/aspect checks
      }
    }

    if (fileSizeMB > VIDEO_WARN_MB) {
      return {
        valid: true,
        warning: `Large video (${fileSizeMB.toFixed(0)} MB). This may take a while — keep this tab open and active during the upload.`,
      };
    }

    return { valid: true };
  }

  return { valid: true };
}
