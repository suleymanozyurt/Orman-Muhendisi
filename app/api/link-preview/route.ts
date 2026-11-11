import { fetchLinkPreview } from "../../link-preview-server";
import { previewUrl } from "../../link-preview";
import { internalLinkPreview } from "../../shared-content";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const send = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  try {
    const raw = await request.text(); if (raw.length > 2500) return send({ error: 'INVALID_LINK' }, 400);
    const url = previewUrl(JSON.parse(raw).url); if (!url) return send({ error: 'INVALID_LINK' }, 400);
    const internal = await internalLinkPreview(url);
    const preview = internal === undefined ? await fetchLinkPreview(url) : internal;
    return preview ? send({ preview: { ...preview, url } }) : send({ error: 'PREVIEW_UNAVAILABLE' }, 422);
  } catch (cause) { return send({ error: cause instanceof Error && cause.message === 'INVALID_LINK' ? 'INVALID_LINK' : 'PREVIEW_UNAVAILABLE' }, 422); }
}
