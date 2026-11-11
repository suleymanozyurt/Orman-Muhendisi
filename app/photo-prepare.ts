/** Resize on the device and strip original EXIF metadata before uploading. */
export async function compactPhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type) || file.size > 20_000_000) throw new Error("INVALID_PHOTO");
  let image: CanvasImageSource, width: number, height: number, close: () => void;
  try {
    if (typeof createImageBitmap !== "function") throw new Error("NO_BITMAP");
    const bitmap = await createImageBitmap(file);
    image = bitmap; width = bitmap.width; height = bitmap.height; close = () => bitmap.close();
  } catch {
    const element = new Image(), url = URL.createObjectURL(file);
    try { await new Promise<void>((resolve, reject) => { element.onload = () => resolve(); element.onerror = reject; element.src = url; }); }
    catch { URL.revokeObjectURL(url); throw new Error("INVALID_PHOTO"); }
    image = element; width = element.naturalWidth; height = element.naturalHeight; close = () => URL.revokeObjectURL(url);
  }
  const scale = Math.min(1, 1920 / Math.max(width, height)), canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) { close(); throw new Error("INVALID_PHOTO"); }
  context.drawImage(image, 0, 0, canvas.width, canvas.height); close();
  let blob: Blob | null = null;
  for (const quality of [.88, .74, .58, .4]) { blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality)); if (blob && blob.size <= 1_500_000) break; }
  if (!blob || blob.size > 1_500_000) throw new Error("INVALID_PHOTO");
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}
