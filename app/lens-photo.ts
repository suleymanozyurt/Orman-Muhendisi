import { compactPhoto } from "./photo-prepare";
import { lensCropPixels, type LensCrop } from "./lens-crop";
export async function croppedLensPhoto(file: File, crop: LensCrop) {
  if (crop.x === 0 && crop.y === 0 && crop.width === 1 && crop.height === 1) return file;
  const url = URL.createObjectURL(file), image = new Image();
  try {
    image.src = url; await image.decode();
    const area = lensCropPixels(crop, image.naturalWidth, image.naturalHeight), canvas = document.createElement("canvas");
    canvas.width = area.width; canvas.height = area.height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("IMAGE_UNAVAILABLE");
    context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("IMAGE_UNAVAILABLE")), "image/jpeg", .9));
    return compactPhoto(new File([blob], "kadraj.jpg", { type: "image/jpeg" }));
  } finally { URL.revokeObjectURL(url); }
}
