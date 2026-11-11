import { siteOrigin } from "./seo.ts";
export type ShareTarget = { url: string; title: string; text?: string; image?: string };
export function shareUrl(value: string) {
  const input = new URL(value, siteOrigin);
  // Preview URLs, private tokens and local fragments must never be shared.
  const output = new URL('/', siteOrigin);
  for (const key of ['view','species','flora','entry','observation','topic','group','taxon']) {
    const value = input.searchParams.get(key); if (value) output.searchParams.set(key, value);
  }
  return output.href;
}
export function requestShare(target: ShareTarget) {
  window.dispatchEvent(new CustomEvent<ShareTarget>('orman:share', { detail: { ...target, url: shareUrl(target.url) } }));
}
export function socialShareLinks(target: ShareTarget) {
  const url = shareUrl(target.url), text = target.text || target.title;
  return { facebook: 'https://www.facebook.com/sharer/sharer.php?' + new URLSearchParams({ u: url }),
    x: 'https://twitter.com/intent/tweet?' + new URLSearchParams({ url, text: text.slice(0, 200) }),
    whatsapp: 'https://wa.me/?' + new URLSearchParams({ text: text.slice(0, 400) + '\n' + url }) };
}
