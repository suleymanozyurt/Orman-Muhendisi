import {handleLifePopular} from "./handler";
import {rawDatabase} from "../../../db/runtime";
import {handleLife} from "../life/handler";
import type {LifePage} from "../../life-types";
export const dynamic="force-dynamic";
async function handle(request:Request){return handleLifePopular(request,await rawDatabase(),async id=>{
 const response=await handleLife(new Request(new URL(`/api/life?id=${id}`,request.url)));if(!response.ok)return null;
 return (await response.json() as LifePage).node;
});}
export const GET=handle;export const POST=handle;
