import { robotsText } from "../seo";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return new Response(robotsText(request.headers.get("x-orman-public-indexing") === "1"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
