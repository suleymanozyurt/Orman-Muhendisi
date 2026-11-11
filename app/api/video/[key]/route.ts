import { handleVideo } from "./handler.ts";
import type { RawDB } from "../../../../db/runtime.ts";
export const dynamic = "force-dynamic";
async function handle(request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  const env = (await import("cloudflare:workers")).env as unknown as { DB?: RawDB; BUCKET?: Parameters<typeof handleVideo>[3] };
  return handleVideo(request, key, env.DB, env.BUCKET);
}
export const GET = handle;
export const HEAD = handle;
