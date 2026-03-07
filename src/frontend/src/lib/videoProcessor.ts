/**
 * videoProcessor.ts
 * Client-side video utilities for RevSpace:
 *  - Thumbnail extraction from first frame
 *  - Client-side compression (canvas + MediaRecorder where supported)
 *  - File chunking for upload progress reporting
 */

import { toast } from "sonner";

// ── Thumbnail Generation ──────────────────────────────────────────────────────

/**
 * Generate a JPEG thumbnail from the first frame of a video file.
 * Returns a base64 data URL string (image/jpeg).
 *
 * Seeks to `seekTo` seconds (default 0.1s) before capturing to avoid
 * black frames at the very start of some encoded videos.
 */
export async function generateVideoThumbnail(
  file: File,
  seekTo = 0.1,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");

    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.crossOrigin = "anonymous";

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.src = "";
      video.load();
    };

    const captureFrame = () => {
      // Clamp dimensions to 720 x 1280 to keep thumbnails small
      const MAX_W = 720;
      const MAX_H = 1280;
      let { videoWidth: w, videoHeight: h } = video;

      if (w === 0 || h === 0) {
        w = 640;
        h = 360;
      }

      const ratio = Math.min(MAX_W / w, MAX_H / h, 1);
      const cw = Math.round(w * ratio);
      const ch = Math.round(h * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        reject(new Error("Canvas 2D not supported"));
        return;
      }

      ctx.drawImage(video, 0, 0, cw, ch);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      cleanup();
      resolve(dataUrl);
    };

    video.addEventListener("seeked", captureFrame, { once: true });

    video.addEventListener(
      "loadedmetadata",
      () => {
        // Clamp seekTo to [0, duration - 0.01] in case video is very short
        const safeSeeked = Math.min(seekTo, (video.duration || 1) - 0.01);
        video.currentTime = Math.max(0, safeSeeked);
      },
      { once: true },
    );

    video.addEventListener(
      "error",
      () => {
        cleanup();
        reject(new Error("Failed to load video for thumbnail extraction"));
      },
      { once: true },
    );

    video.src = objectUrl;
    video.load();
  });
}

// ── Video Metadata Loader ────────────────────────────────────────────────────

interface VideoMeta {
  width: number;
  height: number;
  duration: number;
}

function loadVideoMetadata(file: File): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";

    video.addEventListener(
      "loadedmetadata",
      () => {
        const meta = {
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
        };
        URL.revokeObjectURL(url);
        video.src = "";
        resolve(meta);
      },
      { once: true },
    );

    video.addEventListener(
      "error",
      () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to read video metadata"));
      },
      { once: true },
    );

    video.src = url;
    video.load();
  });
}

// ── Video Compression ────────────────────────────────────────────────────────

interface CompressOptions {
  /** Maximum output height in pixels. Defaults to 720. */
  maxHeightPx?: number;
  /** Called with a progress value 0–100 during transcoding. */
  onProgress?: (pct: number) => void;
}

/**
 * Attempt client-side video compression if the video is large (>80 MB or height >720px).
 * Uses canvas + MediaRecorder if available; returns the original file if the browser
 * doesn't support it, showing a toast warning.
 *
 * NOTE: canvas-based transcoding is lossy and slow in the browser; it is used as a
 * best-effort fallback. Most modern mobile browsers don't fully support MediaRecorder
 * for video transcoding, so the original file is commonly returned.
 */
export async function compressVideoIfNeeded(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const { maxHeightPx = 720, onProgress } = options;
  const fileSizeMB = file.size / (1024 * 1024);

  // Only compress if the file is large enough to warrant the effort
  if (fileSizeMB <= 80) {
    return file;
  }

  let meta: VideoMeta;
  try {
    meta = await loadVideoMetadata(file);
  } catch {
    // Can't read metadata — skip compression, upload original
    return file;
  }

  const needsCompression = meta.height > maxHeightPx;
  if (!needsCompression) {
    return file;
  }

  // Check MediaRecorder support — required for canvas-based transcoding
  if (
    typeof MediaRecorder === "undefined" ||
    !MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
  ) {
    toast.warning(
      "Video compression not supported in this browser — uploading original",
      { duration: 5000 },
    );
    return file;
  }

  try {
    const compressed = await transcodeWithCanvasMediaRecorder(
      file,
      meta,
      maxHeightPx,
      onProgress,
    );
    const compressedMB = compressed.size / (1024 * 1024);
    const originalMB = file.size / (1024 * 1024);
    // If compression actually made it bigger, return original
    if (compressed.size >= file.size) {
      return file;
    }
    toast.success(
      `Video compressed: ${originalMB.toFixed(0)} MB → ${compressedMB.toFixed(0)} MB`,
      { duration: 3000 },
    );
    return compressed;
  } catch {
    toast.warning("Video compression not supported — uploading original", {
      duration: 5000,
    });
    return file;
  }
}

async function transcodeWithCanvasMediaRecorder(
  file: File,
  meta: VideoMeta,
  maxHeightPx: number,
  onProgress?: (pct: number) => void,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const ratio = Math.min(maxHeightPx / meta.height, 1);
    const outW = Math.round(meta.width * ratio);
    const outH = Math.round(meta.height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas not available"));
      return;
    }

    const stream = canvas.captureStream(30);

    let mimeType = "video/webm;codecs=vp8";
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      mimeType = "video/webm;codecs=vp9";
    }

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 2_500_000, // 2.5 Mbps — good quality for 720p
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const compressed = new File(
        [blob],
        file.name.replace(/\.[^.]+$/, ".webm"),
        { type: "video/webm" },
      );
      resolve(compressed);
    };

    recorder.onerror = () => reject(new Error("MediaRecorder error"));

    const videoEl = document.createElement("video");
    videoEl.muted = true;
    videoEl.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    videoEl.src = objectUrl;

    const renderFrame = () => {
      if (videoEl.ended || videoEl.paused) return;
      ctx.drawImage(videoEl, 0, 0, outW, outH);

      if (meta.duration > 0) {
        onProgress?.(Math.round((videoEl.currentTime / meta.duration) * 100));
      }

      requestAnimationFrame(renderFrame);
    };

    videoEl.addEventListener(
      "play",
      () => {
        recorder.start(100); // emit data every 100ms
        renderFrame();
      },
      { once: true },
    );

    videoEl.addEventListener(
      "ended",
      () => {
        recorder.stop();
        for (const t of stream.getTracks()) t.stop();
        URL.revokeObjectURL(objectUrl);
        onProgress?.(100);
      },
      { once: true },
    );

    videoEl.addEventListener(
      "error",
      () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Video playback error during compression"));
      },
      { once: true },
    );

    videoEl.play().catch(reject);
  });
}

// ── File Chunker ─────────────────────────────────────────────────────────────

/**
 * Split a video File into an array of Blob chunks.
 * Each chunk is `chunkSizeMB` megabytes (default 1.5 MB).
 * The last chunk may be smaller.
 */
export function splitVideoIntoChunks(file: File, chunkSizeMB = 1.5): Blob[] {
  const chunkBytes = Math.floor(chunkSizeMB * 1024 * 1024);
  const chunks: Blob[] = [];
  let offset = 0;

  while (offset < file.size) {
    chunks.push(file.slice(offset, offset + chunkBytes, file.type));
    offset += chunkBytes;
  }

  return chunks;
}
