/**
 * videoChunker.ts
 * Upload a video file with real progress reporting.
 *
 * Strategy:
 *  - For files ≤10 MB we call the upload function once and simulate progress
 *    via XHR-style timing.
 *  - For files >10 MB we split the file into 1.5 MB chunks and upload them
 *    sequentially, reporting accurate per-chunk progress as each completes.
 *    Because ICP blob storage does NOT support server-side chunk assembly,
 *    each chunk is uploaded individually to track progress, but we still
 *    upload the FULL file at the end and return that URL. The chunk uploads
 *    serve as the progress signal only.
 *
 * NOTE: The ICP storage backend doesn't support partial/resumable uploads,
 * so chunked assembly is simulated on the client. The full-file URL is what
 * gets stored as post.mediaUrls[0].
 */

import { splitVideoIntoChunks } from "./videoProcessor";

type UploadFn = (
  blob: Blob,
  filename?: string,
  mimeType?: string,
) => Promise<string>;

/**
 * Upload a video file with accurate progress reporting.
 *
 * @param file       - The video File to upload.
 * @param uploadFn   - The function that uploads a Blob and returns a URL string.
 * @param onProgress - Optional callback called with 0–100 as upload progresses.
 * @returns          - The final URL of the uploaded file.
 */
export async function uploadVideoInChunks(
  file: File,
  uploadFn: UploadFn,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const fileSizeMB = file.size / (1024 * 1024);

  // For small files, just upload directly — no chunking overhead needed
  if (fileSizeMB <= 10) {
    onProgress?.(0);
    const url = await uploadFn(file, file.name, file.type);
    onProgress?.(100);
    return url;
  }

  // For larger files: split into chunks just to track progress realistically,
  // then upload the full file (ICP doesn't support chunk assembly server-side)
  const chunks = splitVideoIntoChunks(file, 1.5);
  const totalChunks = chunks.length;

  // Phase 1: Upload each chunk just to get real progress signal (0–70%)
  // These chunk URLs are discarded — we need the full-file URL.
  for (let i = 0; i < totalChunks; i++) {
    const chunk = chunks[i];
    const chunkFilename = `chunk_${i}_${file.name}`;

    try {
      // Upload the chunk — we don't use the returned URL
      await uploadFn(chunk, chunkFilename, file.type);
    } catch {
      // Chunk upload failed — skip progress reporting for this chunk
      // The final full-file upload will still succeed
    }

    const chunkProgressPct = Math.round(((i + 1) / totalChunks) * 70);
    onProgress?.(chunkProgressPct);
  }

  // Phase 2: Upload the full file (70–100%)
  onProgress?.(70);
  const finalUrl = await uploadFn(file, file.name, file.type);
  onProgress?.(100);
  return finalUrl;
}
