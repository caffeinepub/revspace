/**
 * Converts HEIC/HEIF and WebP files to JPEG using canvas.
 * Falls back to returning the original file if conversion is not needed or fails.
 *
 * - HEIC/HEIF: Apple's image format — browsers can't natively display or upload these,
 *   so we always convert to JPEG.
 * - WebP: Natively supported in modern browsers but some older Android WebViews
 *   can fail to upload WebP. Converting to JPEG avoids silent upload failures.
 */

// Use a neutral dynamic importer to avoid TypeScript module-not-found errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dynamicImport = (mod: string): Promise<any> =>
  new Function("m", "return import(m)")(mod);

/** Convert any image Blob to JPEG via canvas. Returns null if conversion fails. */
async function canvasToJpeg(
  blob: Blob,
  outputName: string,
): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    const jpegBlob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", 0.92),
    );
    if (!jpegBlob) return null;
    return new File([jpegBlob], outputName, { type: "image/jpeg" });
  } catch {
    return null;
  }
}

export async function convertHeicToJpeg(file: File): Promise<File> {
  const nameLower = file.name.toLowerCase();

  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    nameLower.endsWith(".heic") ||
    nameLower.endsWith(".heif");

  const isWebp = file.type === "image/webp" || nameLower.endsWith(".webp");

  // Pass through anything that doesn't need conversion
  if (!isHeic && !isWebp) return file;

  const outputName = file.name.replace(/\.(heic|heif|webp)$/i, ".jpg");

  if (isHeic) {
    // Try canvas-based conversion first
    const canvasResult = await canvasToJpeg(file, outputName);
    if (canvasResult) return canvasResult;

    // Canvas failed (e.g. Safari can't decode HEIC via createImageBitmap in some versions);
    // fall back to heic2any library if available
    try {
      const mod = await dynamicImport("heic2any").catch(() => null);
      if (mod) {
        const heic2any = mod.default ?? mod;
        const blob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.92,
        });
        const resultBlob = Array.isArray(blob) ? blob[0] : blob;
        return new File([resultBlob], outputName, { type: "image/jpeg" });
      }
    } catch {
      // fall through
    }
    // If all conversion fails, return original and let the upload try anyway
    return file;
  }

  if (isWebp) {
    // Canvas conversion is always sufficient for WebP since the browser
    // already understands WebP for rendering purposes
    const canvasResult = await canvasToJpeg(file, outputName);
    return canvasResult ?? file;
  }

  return file;
}

/**
 * Convenience wrapper used by upload handlers that need to normalise any
 * image format before sending to storage. Handles HEIC, HEIF, and WebP.
 */
export async function convertToJpegIfNeeded(file: File): Promise<File> {
  if (file.type.startsWith("video/")) return file;
  return convertHeicToJpeg(file);
}
