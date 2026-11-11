import { publicObservation } from "../../shared-content";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') || '';
  try { const record = await publicObservation(id); return Response.json({ record }, { status: record ? 200 : 404, headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'OBSERVATION_UNAVAILABLE' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
