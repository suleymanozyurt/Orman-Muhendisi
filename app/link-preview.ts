export type LinkPreview = { url: string; title: string; description: string; siteName: string; image?: string };

/** Shared by the editor and server. Reject credentials, local hosts and IP literals. */
export function previewUrl(value: unknown, base?: string): string {
  if (typeof value !== "string" || value.length > 2000) return "";
  try {
    const url = new URL(value.trim(), base), host = url.hostname.toLowerCase();
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port ||
        !host.includes('.') || host.endsWith('.') || host.includes(':') || /^[\d.]+$/.test(host) ||
        /(?:^|\.)(?:localhost|local|internal|test|invalid|example|home|lan|onion)$/.test(host)) return "";
    url.hash = "";
    return url.href;
  } catch { return ""; }
}
export function firstLink(text: string) {
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) || [];
  for (const match of matches) { const url = previewUrl(match.replace(/[.,;!?)]*$/, "")); if (url) return url; }
  return "";
}
export function readLinkPreview(value: unknown): LinkPreview | undefined {
  try {
    const data = typeof value === "string" ? JSON.parse(value) : value;
    if (!data || typeof data !== "object" || !previewUrl(data.url)) return;
    return { url: previewUrl(data.url), title: String(data.title || "").slice(0, 200), description: String(data.description || "").slice(0, 400),
      siteName: String(data.siteName || new URL(data.url).hostname).slice(0, 100), ...(previewUrl(data.image) ? { image: previewUrl(data.image) } : {}) };
  } catch { return; }
}
