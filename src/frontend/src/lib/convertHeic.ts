/**
 * Converts a HEIC/HEIF file to a JPEG File object using canvas.
 * Falls back to returning the original file if it's not HEIC or conversion fails.
 */

// Use a neutral dynamic importer to avoid TypeScript module-not-found errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dynamicImport = (mod: string): Promise<any> =>
  new Function("m", "return import(m)")(mod);

export async function convertHeicToJpeg(file: File): Promise<File> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");

  if (!isHeic) return file;

  try {
    // Try canvas-based fallback first (no external deps needed)
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);
    const jpegBlob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", 0.92),
    );
    if (!jpegBlob) return file;
    const jpegName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
    return new File([jpegBlob], jpegName, { type: "image/jpeg" });
  } catch {
    // canvas approach didn't work; try heic2any if available
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
        const jpegName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
        return new File([resultBlob], jpegName, { type: "image/jpeg" });
      }
    } catch {
      // fall through
    }
    // If all conversion fails, return the original and let the upload try anyway
    return file;
  }
}
