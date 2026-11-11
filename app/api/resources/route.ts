import {rawDatabase} from "../../../db/runtime";import {handleResources} from "./handler";export const dynamic="force-dynamic";
export async function GET(r:Request){return handleResources(r,await rawDatabase());}export async function POST(r:Request){return handleResources(r,await rawDatabase());}
