export const socialPlatforms = ["instagram", "facebook", "youtube", "tiktok", "x"] as const;
export type SocialPlatform = typeof socialPlatforms[number];
import { isSocialMediaKey } from "./social-media-key.ts";
export type SocialMedia = { type: "image" | "video"; url?: string; path?: string; uploadedKey?: string; previewKey?: string; previewWidth?: number; width?: number; height?: number; alt: string };
export type SocialPost = {
  id: string; platform: SocialPlatform; title: string; text: string; publishedAt: string;
  sourceUrl: string; media: SocialMedia[]; status: "draft" | "published"; revision: number;
  archive?: { account: string; exportedAt: string; type: string };
};
export const socialAccounts = [
  { platform: "instagram", name: "Instagram", handle: "@ormanmuhendisi", url: "https://www.instagram.com/ormanmuhendisi/" },
  { platform: "x", name: "X", handle: "@0rmanmuhendisi", url: "https://x.com/0rmanmuhendisi" },
  { platform: "youtube", name: "YouTube", handle: "@ormaninmuhendisi", url: "https://www.youtube.com/@ormaninmuhendisi" },
  { platform: "facebook", name: "Facebook", handle: "@0rmanmuhendisi", url: "https://www.facebook.com/0rmanmuhendisi" },
  { platform: "tiktok", name: "TikTok", handle: "@ormanmuhendisi", url: "https://www.tiktok.com/@ormanmuhendisi" },
] as const;
// Only content with a retrievable original post is included. No fabricated recent posts or metrics.
export const sourcedSocialPosts: SocialPost[] = [{
  id: "source-x-1210617713313402889", platform: "x", title: "Ağacın yapısını anlamak",
  text: "Orman Mühendisi’nin selüloz, lignin ve hemiselülozun ağacın yapısındaki rolünü anlattığı arşiv paylaşımı.",
  publishedAt: "2019-12-27T09:45:00.000Z", sourceUrl: "https://x.com/0rmanmuhendisi/status/1210617713313402889",
  media: [], status: "published", revision: 0,
}];
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const str = (value: unknown) => typeof value === "string" ? value.trim() : "";
export function socialSearchText(value: string) { return value.toLocaleLowerCase("tr").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i"); }
export function safeSocialMediaUrl(value: unknown) {
  try {
    const url = new URL(str(value)), host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
        !host.includes(".") || /^(?:localhost|0\.|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host) ||
        /\.(?:local|internal|localhost)$/.test(host) || host.includes(":")) return "";
    return url.href;
  } catch { return ""; }
}
export function socialSourceUrl(value: unknown, platform: SocialPlatform) {
  const clean = safeSocialMediaUrl(value); if (!clean) return "";
  const url = new URL(clean), host = url.hostname.replace(/^www\./, "");
  const domains: Record<SocialPlatform, string[]> = { instagram: ["instagram.com"], facebook: ["facebook.com", "fb.watch"], youtube: ["youtube.com", "youtu.be"], tiktok: ["tiktok.com"], x: ["x.com", "twitter.com"] };
  return domains[platform].includes(host) ? clean : "";
}
export function isSocialProfileUrl(value: string) {
  return socialAccounts.some(account => account.url.replace(/\/$/, "") === value.replace(/\/$/, ""));
}
export function socialKind(post: Pick<SocialPost, "media" | "sourceUrl" | "platform">) {
  return post.media.some(media => media.type === "video") || post.platform === "youtube" && /\/watch|\/shorts\/|youtu\.be\//.test(post.sourceUrl) ? "video" : post.media.some(media => media.type === "image") ? "photo" : "article";
}
export function youtubeSocialEmbed(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl), host = url.hostname.replace(/^www\./, "");
    const id = host === "youtu.be" ? url.pathname.slice(1) : host === "youtube.com" ? url.searchParams.get("v") || url.pathname.match(/^\/shorts\/([^/]+)/)?.[1] : "";
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : "";
  } catch { return ""; }
}
export function validateSocialPost(value: unknown): value is SocialPost {
  const p = record(value);
  return typeof p.id === "string" && /^(?:[a-f0-9]{64}|[a-f0-9-]{36})$/.test(p.id) && socialPlatforms.includes(p.platform as SocialPlatform) &&
    typeof p.title === "string" && p.title.trim().length > 0 && p.title.length <= 180 && typeof p.text === "string" && p.text.length <= 20000 &&
    typeof p.sourceUrl === "string" && (!p.sourceUrl || socialSourceUrl(p.sourceUrl, p.platform as SocialPlatform) === p.sourceUrl) &&
    typeof p.publishedAt === "string" && (!p.publishedAt || /^\d{4}-\d{2}-\d{2}T/.test(p.publishedAt) && Number.isFinite(Date.parse(p.publishedAt))) &&
    ["draft", "published"].includes(p.status as string) && Number.isInteger(p.revision) && Number(p.revision) >= 0 &&
    Array.isArray(p.media) && p.media.length <= 100 && p.media.every(value => {
      const m = record(value); return ["image", "video"].includes(m.type as string) && typeof m.alt === "string" && m.alt.length <= 300 &&
        (!m.url || typeof m.url === "string" && m.url.length <= 2000 && safeSocialMediaUrl(m.url) === m.url) &&
        (!m.path || typeof m.path === "string" && m.path.length <= 1000 && !/^(?:https?:|data:|javascript:)/i.test(m.path)) &&
        (!m.uploadedKey || isSocialMediaKey(m.uploadedKey, m.type as "image" | "video")) &&
        (!m.previewKey || isSocialMediaKey(m.previewKey, "image")) &&
        (m.previewWidth === undefined || Number.isInteger(m.previewWidth) && Number(m.previewWidth) > 0 && Number(m.previewWidth) <= 20000) &&
        (m.width === undefined || Number.isInteger(m.width) && Number(m.width) > 0 && Number(m.width) <= 20000) &&
        (m.height === undefined || Number.isInteger(m.height) && Number(m.height) > 0 && Number(m.height) <= 20000) &&
        Boolean(m.url || m.path || m.uploadedKey);
    }) && Boolean(p.text.trim() || p.sourceUrl || p.media.length);
}
export function unresolvedSocialMedia(post: SocialPost) { return post.media.filter(media => !media.url && !media.uploadedKey); }
async function archiveId(platform: SocialPlatform, identity: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(platform + ":" + identity));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
function archiveDate(value: unknown) {
  const input = str(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
    const calendar = new Date(input.slice(0, 10));
    if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== input.slice(0, 10)) throw new Error("ARCHIVE_ITEM_INVALID");
  }
  const date = typeof value === "number" ? new Date(value * 1000) : str(value) ? new Date(str(value)) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : "";
}
function archiveMedia(raw: unknown): SocialMedia[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(value => {
    const media = record(value), source = str(media.url) || str(media.uri) || str(media.path), url = safeSocialMediaUrl(source);
    return { type: media.type === "video" || /\.(?:mp4|mov|webm)(?:\?|$)/i.test(source) ? "video" : "image", ...(url ? { url } : source ? { path: source } : {}),
      ...(media.uploadedKey ? { uploadedKey: str(media.uploadedKey) } : {}), alt: str(media.alt) || str(media.title) } as SocialMedia;
  }).filter(media => media.url || media.path || media.uploadedKey);
}
/** Reads published post formats only; messages, contacts, likes and follower lists are rejected. */
export async function parseSocialArchive(raw: unknown, platform: SocialPlatform) {
  const wrapper = record(raw);
  if (["messages", "participants", "conversations", "likes", "followers", "following"].some(key => key in wrapper)) throw new Error("PRIVATE_ARCHIVE");
  const values = Array.isArray(raw) ? raw : [wrapper.posts, wrapper.your_posts, wrapper.ig_posts, wrapper.tweets].find(Array.isArray);
  if (!values || values.length > 25000) throw new Error("ARCHIVE_FORMAT");
  const posts: SocialPost[] = []; let skipped = 0;
  for (const value of values) {
    const base = record(value), tweet = record(base.tweet), p = Object.keys(tweet).length ? tweet : base;
    if (["message", "sender", "recipient", "retweeted_status"].some(key => key in p) || /^RT @/.test(str(p.full_text))) { skipped++; continue; }
    const own = Array.isArray(p.data) ? p.data.map(item => str(record(item).post)).filter(Boolean).join("\n\n") : "";
    const text = str(p.text) || str(p.full_text) || str(p.caption) || own || str(p.title);
    const platformName = socialPlatforms.includes(p.platform as SocialPlatform) ? p.platform as SocialPlatform : platform;
    const publishedAt = archiveDate(p.publishedAt || p.creation_timestamp || p.timestamp || p.created_at);
    const original = str(p.sourceUrl) || str(p.permalink) || str(p.url);
    if (original && !socialSourceUrl(original, platformName)) throw new Error("ARCHIVE_ITEM_INVALID");
    const sourceUrl = socialSourceUrl(original, platformName) || (platformName === "x" && /^\d+$/.test(str(p.id_str)) ? `https://x.com/0rmanmuhendisi/status/${p.id_str}` : "");
    const attachments = Array.isArray(p.attachments) ? p.attachments.flatMap(item => { const a = record(item); return Array.isArray(a.data) ? a.data.map(d => record(d).media).filter(Boolean) : []; }) : [];
    const media = archiveMedia(p.media || attachments);
    if (!text && !sourceUrl && !media.length) { skipped++; continue; }
    const title = str(p.title).slice(0, 180) || text.split("\n")[0].slice(0, 120) || "Orman Mühendisi";
    const identity = (sourceUrl && !isSocialProfileUrl(sourceUrl) ? sourceUrl : "") || str(p.id_str) || str(p.id) || JSON.stringify([text, publishedAt, media.map(m => m.url || m.path || m.uploadedKey)]);
    const post: SocialPost = { id: await archiveId(platformName, identity), platform: platformName, title, text, publishedAt, sourceUrl, media, status: "draft", revision: 0 };
    if (!validateSocialPost(post)) throw new Error("ARCHIVE_ITEM_INVALID");
    posts.push(post);
  }
  const unique = [...new Map(posts.map(post => [post.id, post])).values()];
  return { posts: unique, skipped, duplicates: posts.length - unique.length, unresolved: unique.reduce((n, post) => n + unresolvedSocialMedia(post).length, 0) };
}
export function chunkSocialImports(posts: SocialPost[]) {
  const batches: SocialPost[][] = []; let batch: SocialPost[] = [], size = 0;
  for (const post of posts) {
    const bytes = new TextEncoder().encode(JSON.stringify(post)).length + 1;
    if (batch.length && (batch.length >= 40 || size + bytes > 450000)) { batches.push(batch); batch = []; size = 0; }
    batch.push(post); size += bytes;
  }
  if (batch.length) batches.push(batch); return batches;
}
export function parseSocialArchiveText(text: string) {
  // X exports are a JSON array assigned to window.YTD.tweets.partN; never execute export JavaScript.
  const clean = text.replace(/^\s*window\.YTD\.tweets\.part\d+\s*=\s*/, "").trim().replace(/;\s*$/, "");
  return JSON.parse(clean) as unknown;
}
