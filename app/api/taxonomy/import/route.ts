import {rawDatabase} from "../../../../db/runtime";
import {handleTaxonomyImport} from "../../../taxonomy-import";
export const dynamic="force-dynamic";
// Shared source update, protected by the selected owner-private Sites boundary.
export async function GET(request:Request){return handleTaxonomyImport(request,await rawDatabase());}
export async function POST(request:Request){return handleTaxonomyImport(request,await rawDatabase());}
