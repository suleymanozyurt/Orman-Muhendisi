import { handleSourceArchive } from "./handler.ts";
import type { RawDB } from "../../../db/runtime.ts";
import type { ArchiveBucket } from "./multipart.ts";
export const dynamic = "force-dynamic";
async function handle(request: Request) {
  let env: { SOURCE_ARCHIVE_IMPORT_KEY?: string; DB?: RawDB; BUCKET?: ArchiveBucket } = {};
  try { env = (await import("cloudflare:workers")).env as unknown as typeof env; } catch { /* No importer outside its configured Worker runtime. */ }
  return handleSourceArchive(request, { key: env.SOURCE_ARCHIVE_IMPORT_KEY, db: env.DB, bucket: env.BUCKET });
}
export const POST = handle;
export const GET = handle;
