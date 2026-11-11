export type FeedPhoto = { url: string; credit: string; license: string; reference?: string };
export type FeedRecord = { id: string; name: string; family: string; author: string; date: string; location: string; photos: FeedPhoto[] };
export type Engagement = { comments: { author: string; text: string }[]; likeCount: number };
export function reusablePhoto(license: unknown): boolean {
  return typeof license === "string" && /^https?:\/\/(www\.)?creativecommons\.org\/(licenses\/(by|by-sa)\/\d\.\d\/?|publicdomain\/(zero|mark)\/1\.0\/?)$/i.test(license);
}
export function licensedPhotos(media: unknown): FeedPhoto[] {
  if (!Array.isArray(media)) return [];
  return media.filter(m => m?.type === "StillImage" && typeof m.identifier === "string" && m.identifier.startsWith("https://") && reusablePhoto(m.license)).slice(0, 10).map(m => ({ url: /^https:\/\/inaturalist-open-data\.s3\.amazonaws\.com\/photos\/\d+\/original\.jpg$/.test(m.identifier) ? m.identifier.replace("/original.jpg", "/large.jpg") : m.identifier, credit: String(m.creator || m.rightsHolder || m.publisher || ""), license: String(m.license), reference: typeof m.references === "string" && m.references.startsWith("https://") ? m.references : undefined }));
}
