import {handleLife} from "./handler";
export const dynamic="force-dynamic";
export async function GET(request:Request){return handleLife(request);}
