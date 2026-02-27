/**
 * Converts a HEIC/HEIF file to a JPEG File object.
 * Falls back to returning the original file if it's not HEIC or conversion fails.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");

  if (!isHeic) return file;

  try {
    const heic2any = (await import("heic2any")).default;
    const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const resultBlob = Array.isArray(blob) ? blob[0] : blob;
    const jpegName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
    return new File([resultBlob], jpegName, { type: "image/jpeg" });
  } catch {
    // If conversion fails, return the original and let the upload try anyway
    return file;
  }
}
