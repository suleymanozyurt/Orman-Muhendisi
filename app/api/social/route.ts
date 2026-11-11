import { rawDatabase } from "../../../db/runtime";
import { handleSocial } from "./handler";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return handleSocial(request, await rawDatabase()); }
export async function POST(request: Request) { return handleSocial(request, await rawDatabase()); }
