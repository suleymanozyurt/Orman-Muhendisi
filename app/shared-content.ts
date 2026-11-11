import { rawDatabase, type RawDB } from "../db/runtime.ts";
import { readLinkPreview, type LinkPreview } from "./link-preview.ts";
import { licensedPhotos } from "./feed-data.ts";
import { plants } from "./plant-data.ts";
import { sourcedSocialPosts, type SocialPost } from "./social-archive-model.ts";
import { siteOrigin, seoRoute, canonicalRoute, isIndexableRoute } from "./seo.ts";
export type SharedObservation = { id: string; author: string; text: string; date: string; plantId?: string; image?: string;
  status: string; comments: { author: string; text: string }[]; photos: { key: string; url: string; organ?: string }[]; linkPreview?: LinkPreview };
/** This query intentionally has no owner/admin override. Private records must never reach cards or crawlers. */
export async function publicObservation(id: string, db?: RawDB): Promise<SharedObservation | null> {
  if (id === 'editorial') return { id, author: 'Orman Mühendisi', date: 'Editörün notu', plantId: 'cedrus-libani', status: 'approved', comments: [], photos: [],
    text: 'Bir sediri tanırken yalnızca genel görünüşüne bakmayın. İğne yaprakları, sürgünleri ve kozalakları birlikte inceleyin; yetiştiği yer de size önemli bir ipucu verir.', image: plants.find(plant => plant.id === 'cedrus-libani')?.image };
  if (/^\d{1,16}$/.test(id)) {
    const response = await fetch('https://api.gbif.org/v1/occurrence/' + id, { signal: AbortSignal.timeout(8000) });
    if (response.status === 404) return null; if (!response.ok) throw new Error('OBSERVATION_UNAVAILABLE');
    const record = await response.json() as Record<string, unknown>, photos = licensedPhotos(record.media);
    if (record.kingdom !== 'Plantae' || !photos.length || !record.species) return null;
    return { id, author: String(record.recordedBy || photos[0].credit || 'Saha gözlemi'), text: String(record.species), date: String(record.eventDate || '').split('T')[0], status: 'approved', comments: [], image: photos[0].url,
      photos: photos.map(photo => ({ ...photo, key: '' })) };
  }
  if (!/^[a-f0-9-]{36}$/.test(id)) return null;
  db ||= await rawDatabase(); if (!db) throw new Error('OBSERVATION_UNAVAILABLE');
  const row = await db.prepare("SELECT id,author,text,plant_id,image_key,created_at,link_preview FROM observations WHERE id=? AND status='approved'").bind(id).first<Record<string, string | null>>();
  if (!row) return null;
  const photos = (await db.prepare('SELECT image_key,organ FROM observation_photos WHERE observation_id=? ORDER BY CAST(position AS INTEGER)').bind(id).all<{ image_key: string; organ: string }>()).results;
  return { id, author: row.author || 'Üye', text: row.text || '', date: new Date(row.created_at || '').toLocaleDateString('tr-TR'), plantId: row.plant_id || undefined,
    image: row.image_key ? '/api/image/' + row.image_key : undefined, status: 'approved', comments: [],
    photos: photos.map(photo => ({ key: photo.image_key, url: '/api/image/' + photo.image_key, organ: photo.organ })), linkPreview: readLinkPreview(row.link_preview) };
}
export async function publicSocialPost(id: string, db?: RawDB): Promise<SocialPost | null> {
  const seeded = sourcedSocialPosts.find(post => post.id === id); if (seeded) return seeded;
  if (!/^(?:[a-f0-9]{64}|[a-f0-9-]{36})$/.test(id)) return null;
  db ||= await rawDatabase(); if (!db) throw new Error('SOCIAL_UNAVAILABLE');
  const row = await db.prepare("SELECT id,title,data FROM resources WHERE id=? AND kind='social' AND status='published'").bind(id).first<{ id: string; title: string; data: string }>();
  return row ? { ...JSON.parse(row.data), id: row.id, title: row.title, status: 'published' } : null;
}
export function socialPostImage(post: SocialPost) {
  const media = post.media.find(media => media.type === 'image' || media.previewKey);
  return media?.previewKey ? '/api/image/' + media.previewKey : media?.uploadedKey && media.type === 'image' ? '/api/image/' + media.uploadedKey : media?.type === 'image' ? media.url : undefined;
}
export async function internalLinkPreview(value: string): Promise<LinkPreview | null | undefined> {
  const url = new URL(value); if (url.origin !== siteOrigin) return undefined;
  if (url.pathname !== "/") throw new Error("PREVIEW_UNAVAILABLE");
  const route = seoRoute(Object.fromEntries(url.searchParams));
  if (route.view === 'home' && route.observation) {
    const post = await publicObservation(route.observation); if (!post) throw new Error('PREVIEW_UNAVAILABLE');
    return { url: canonicalRoute(route), title: post.author + ' · Doğa gözlemi', description: post.text.slice(0, 400), siteName: 'Orman Mühendisi',
      ...(post.image || post.photos[0]?.url ? { image: new URL(post.image || post.photos[0].url, siteOrigin).href } : {}) };
  }
  if (route.view === 'social' && route.entry) {
    const post = await publicSocialPost(route.entry); if (!post) throw new Error('PREVIEW_UNAVAILABLE');
    const image = socialPostImage(post);
    return { url: canonicalRoute(route), title: post.title, description: post.text.slice(0, 400), siteName: 'Orman Mühendisi', ...(image ? { image: new URL(image, siteOrigin).href } : {}) };
  }
  if (!isIndexableRoute(route)) throw new Error('PREVIEW_UNAVAILABLE');
  const { pageContent } = await import('./page-metadata');
  const data = pageContent(route, 'tr'), image = data.plant?.image || data.taxonomy?.node.images[0]?.url;
  return { url: canonicalRoute(route), title: data.title, description: data.description, siteName: 'Orman Mühendisi', ...(image ? { image: new URL(image, siteOrigin).href } : {}) };
}
