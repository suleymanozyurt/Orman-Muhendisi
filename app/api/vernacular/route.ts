import {rawDatabase} from "../../../db/runtime";
import {handleVernacular} from "./handler";
export const dynamic="force-dynamic";
export async function GET(request:Request){return handleVernacular(request,await rawDatabase());}
export async function POST(request:Request){return handleVernacular(request,await rawDatabase());}
