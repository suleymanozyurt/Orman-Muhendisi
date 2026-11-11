import { assistantRuntime } from "../assistant/runtime";
import { handleLensMode } from "./handler";
export const dynamic = "force-dynamic";
export async function POST(request:Request){return handleLensMode(request,await assistantRuntime());}
