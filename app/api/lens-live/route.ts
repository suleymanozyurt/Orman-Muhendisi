import { assistantRuntime } from "../assistant/runtime";
import { handleLensLive } from "./handler";
export const dynamic = "force-dynamic";
export async function POST(request:Request){
  if(!request.headers.get("oai-authenticated-user-id")||request.headers.get("origin")!==new URL(request.url).origin)return handleLensLive(request);
  return handleLensLive(request,await assistantRuntime());
}
