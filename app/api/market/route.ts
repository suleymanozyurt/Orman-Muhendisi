import {rawDatabase} from "../../../db/runtime";import {handleMarket} from "./handler";export const dynamic="force-dynamic";
export async function GET(r:Request){return handleMarket(r,await rawDatabase());}export async function POST(r:Request){return handleMarket(r,await rawDatabase());}
