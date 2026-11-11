import { rawDatabase } from "../../../db/runtime";
import { handleCare } from "./handler";
export const dynamic="force-dynamic";
export async function GET(request:Request){return handleCare(request,await rawDatabase());}
export async function POST(request:Request){return handleCare(request,await rawDatabase());}
