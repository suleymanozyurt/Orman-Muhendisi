export function isSocialMediaKey(value: unknown, type?: "image" | "video"): value is string {
  if (typeof value !== "string") return false;
  const suffix = type === "image" ? "jpg|png|webp" : type === "video" ? "mp4|webm" : "jpg|png|webp|mp4|webm";
  return new RegExp(`^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.(${suffix})$`).test(value);
}
export function socialMediaPath(key: string) { return `/api/${/\.(mp4|webm)$/.test(key) ? "video" : "image"}/${key}`; }
