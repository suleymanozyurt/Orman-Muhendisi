import {rawDatabase} from "../../../db/runtime";
import {handleTaxonomy} from "./handler";
export const dynamic="force-dynamic";
export async function GET(request:Request){return handleTaxonomy(request,await rawDatabase());}
