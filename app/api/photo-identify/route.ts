import { assistantRuntime } from "../assistant/runtime";
import { handlePhotoIdentify } from "./handler";
export const dynamic = "force-dynamic";
export async function GET() { return handlePhotoIdentify(new Request("https://local/api/photo-identify"), await assistantRuntime()); }
export async function POST(request: Request) { return handlePhotoIdentify(request, await assistantRuntime()); }
