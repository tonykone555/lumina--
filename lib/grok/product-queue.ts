import {get,list,put} from "@vercel/blob";
import {createHash,randomUUID} from "node:crypto";
export type GrokQueueRow={id:string;product_id:string;product:Record<string,unknown>;status:"pending"|"in_review"|"reviewed"|"rejected";review:Record<string,unknown>|null;created_at:string;updated_at:string};
const prefix="grok-queue/v1/";
const pathFor=(id:string)=>prefix+createHash("sha256").update(id).digest("hex")+".json";
export async function readGrokProduct(id:string):Promise<GrokQueueRow|null>{
 const res=await get(pathFor(id),{access:"private",useCache:false});
 if(!res)return null;
 return await new Response(res.stream).json() as GrokQueueRow;
}
export async function saveGrokProduct(product:Record<string,unknown>):Promise<GrokQueueRow>{
 const id=String(product.id||"");if(!id)throw Error("PRODUCT_ID_REQUIRED");
 const old=await readGrokProduct(id);
 const now=new Date().toISOString();
 const row:GrokQueueRow=old?{...old,product,updated_at:now}:{id:randomUUID(),product_id:id,product,status:"pending",review:null,created_at:now,updated_at:now};
 await put(pathFor(id),JSON.stringify(row),{access:"private",allowOverwrite:true,contentType:"application/json",cacheControlMaxAge:60});
 return row;
}
export async function listGrokProducts(limit=25):Promise<GrokQueueRow[]>{
 let cursor:string|undefined;const rows:GrokQueueRow[]=[];
 do{
  const page=await list({prefix,limit:100,cursor});
  for(const blob of page.blobs){
   const res=await get(blob.pathname,{access:"private",useCache:false});
   if(res)rows.push(await new Response(res.stream).json() as GrokQueueRow);
  }
  cursor=page.hasMore?page.cursor:undefined;
 }while(cursor&&rows.length<500);
 return rows.sort((a,b)=>a.created_at.localeCompare(b.created_at)).slice(0,Math.min(100,Math.max(1,limit)));
}
export async function updateGrokProduct(queueId:string,patch:{status:GrokQueueRow["status"];review?:Record<string,unknown>}){
 const entries=await listGrokProducts(100);
 const row=entries.find(p=>p.id===queueId);
 if(!row)return null;
 const updated={...row,...patch,updated_at:new Date().toISOString()};
 await put(pathFor(row.product_id),JSON.stringify(updated),{access:"private",allowOverwrite:true,contentType:"application/json",cacheControlMaxAge:60});
 return updated;
}
