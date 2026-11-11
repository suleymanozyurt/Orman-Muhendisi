import { previewUrl, type LinkPreview } from "./link-preview.ts";
const entries = new Map<string, { expires: number; preview: LinkPreview }>();
const entities: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', copy: '©', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
const decode = (value: string) => value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, entity: string) => {
  if (!entity.startsWith('#')) return entities[entity.toLowerCase()] || all;
  const point = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
  return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : '';
});
const plain = (value: string, max: number) => decode(value.replace(/<[^>]*>/g, ' ')).replace(/[\s\u0000-\u001f]+/g, ' ').trim().slice(0, max);
/** Reads inert metadata only; scripts, HTML and embeds are never returned to the client. */
export function parseLinkMetadata(html: string, url: string): LinkPreview {
  const head = html.split(/<body\b/i)[0].replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const values = new Map<string, string>();
  for (const tag of head.match(/<meta\s+(?:[^>"']|"[^"]*"|'[^']*')*>/gi) || []) {
    const attrs = new Map<string, string>();
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs.set(match[1].toLowerCase(), decode(match[2] ?? match[3] ?? match[4]));
    const key = (attrs.get('property') || attrs.get('name') || '').toLowerCase();
    if (key && !values.has(key)) values.set(key, attrs.get('content') || '');
  }
  const host = new URL(url).hostname.replace(/^www\./, '');
  const title = plain(values.get('og:title') || values.get('twitter:title') || head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] || host, 200);
  const image = previewUrl(values.get('og:image:secure_url') || values.get('og:image') || values.get('twitter:image') || '', url);
  return { url, title, description: plain(values.get('og:description') || values.get('twitter:description') || values.get('description') || '', 400),
    siteName: plain(values.get('og:site_name') || host, 100), ...(image ? { image } : {}) };
}
export function publicAddress(address: string) {
  if (address.includes(':')) return /^2[0-9a-f]{3}:/i.test(address) && !/^2001:(?:db8|0):/i.test(address) && !/^2002:/i.test(address);
  const p = address.split('.').map(Number);
  return p.length === 4 && p.every(n => Number.isInteger(n) && n >= 0 && n <= 255) &&
    ![0,10,127].includes(p[0]) && p[0] < 224 && !(p[0] === 100 && p[1] >= 64 && p[1] <= 127) &&
    !(p[0] === 169 && p[1] === 254) && !(p[0] === 172 && p[1] >= 16 && p[1] <= 31) &&
    !(p[0] === 192 && (p[1] === 168 || p[1] === 0 || p[1] === 2)) &&
    !(p[0] === 198 && [18,19,51].includes(p[1])) && !(p[0] === 203 && p[1] === 0 && p[2] === 113);
}
async function publicHost(host: string, fetcher: typeof fetch, signal: AbortSignal) {
  const addresses = (await Promise.all(['A','AAAA'].map(async type => {
    const url = new URL('https://cloudflare-dns.com/dns-query'); url.searchParams.set('name', host); url.searchParams.set('type', type);
    const response = await fetcher(url, { headers: { accept: 'application/dns-json' }, redirect: 'error', signal });
    if (!response.ok) throw new Error('PREVIEW_UNAVAILABLE');
    const data = await response.json() as { Status?: number; Answer?: { type: number; data: string }[] };
    if (data.Status !== 0) throw new Error('PREVIEW_UNAVAILABLE');
    return (data.Answer || []).filter(row => row.type === 1 || row.type === 28).map(row => row.data);
  }))).flat();
  if (!addresses.length || addresses.some(address => !publicAddress(address))) throw new Error('INVALID_LINK');
}
async function readHead(response: Response) {
  if (!response.body) throw new Error('PREVIEW_UNAVAILABLE');
  const reader = response.body.getReader(), decoder = new TextDecoder(); let html = '', bytes = 0;
  try {
    while (bytes < 262144) {
      const part = await reader.read(); if (part.done) break;
      const remaining = 262144 - bytes; bytes += part.value.byteLength;
      html += decoder.decode(part.value.subarray(0, remaining), { stream: true });
      if (/<\/head\s*>|<body\b/i.test(html)) break;
    }
    return html + decoder.decode();
  } finally { await reader.cancel().catch(() => {}); }
}
/** Worker global fetch talks to the public Internet. Never use private bindings or forward viewer credentials. */
export async function fetchLinkPreview(input: string, fetcher: typeof fetch = fetch, useCache = true): Promise<LinkPreview> {
  const requested = previewUrl(input); if (!requested) throw new Error('INVALID_LINK');
  const cached = entries.get(requested); if (useCache && cached && cached.expires > Date.now()) return cached.preview;
  const signal = AbortSignal.timeout(8000); let url = requested;
  for (let redirects = 0; redirects <= 3; redirects++) {
    await publicHost(new URL(url).hostname, fetcher, signal);
    const response = await fetcher(url, { redirect: 'manual', signal, headers: { accept: 'text/html,application/xhtml+xml', 'user-agent': 'OrmanMuhendisi-LinkPreview/1.0' } });
    if ([301,302,303,307,308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get('location'); url = location ? previewUrl(location, url) : '';
      if (!url) throw new Error('INVALID_LINK');
      continue;
    }
    if (!response.ok || !/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type') || '')) {
      await response.body?.cancel(); throw new Error('PREVIEW_UNAVAILABLE');
    }
    const preview = { ...parseLinkMetadata(await readHead(response), url), url: requested };
    if (useCache) { if (entries.size >= 200) entries.delete(entries.keys().next().value!); entries.set(requested, { expires: Date.now() + 3600000, preview }); }
    return preview;
  }
  throw new Error('PREVIEW_UNAVAILABLE');
}
