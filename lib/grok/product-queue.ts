import {get,list,put} from "@vercel/blob";
import {createHash,randomUUID} from "node:crypto";
export type GrokQueueRow={id:string;product_id:string;product:Record<string,unknown>;status:"pending"|"in_review"|"reviewed"|"rejected";review:Record<string,unknown>|null;created_at:string;updated_at:string};
export function labelGrokRoomProduct(product:Record<string,unknown>):Record<string,unknown>{
 const priorBrand=String(product.original_brand||product.brand||"").trim();
 const provenance=(product.provenance&&typeof product.provenance==="object"?product.provenance:{}) as Record<string,unknown>;
 const seller={name:"YNOT",role:"retailer",controls:["retail_price","customer_service","customer_offer"]};
 const origin={
  original_brand:String(provenance.original_brand||priorBrand||"")||null,
  original_maker:provenance.original_maker||product.maker||product.manufacturer||null,
  original_supplier:provenance.original_supplier||product.supplier||null,
  source_product_url:provenance.source_product_url||product.source_url||product.url||null,
  source_platform:provenance.source_platform||product.source||null
 };
 return {...product,seller,provenance:origin,fulfillment:{model:"supplier_or_production_partner",supplier_stock_verified:false,shipping_origin_verified:false},marketplace_eligibility:{etsy:"unverified",ebay:"unverified",publish_approved:false,note:"YNOT is the retailer. Source maker and brand are retained. Etsy eligibility needs independent verification; never claim an outside product was made or designed by YNOT."}};
}
export function labelGrokRoomRow(row:GrokQueueRow):GrokQueueRow{return {...row,product:labelGrokRoomProduct(row.product)}}
const prefix="grok-queue/v1/";
const pathFor=(id:string)=>prefix+createHash("sha256").update(id).digest("hex")+".json";
export async function readGrokProduct(id:string):Promise<GrokQueueRow|null>{
 const res=await get(pathFor(id),{access:"private"});
 if(!res)return null;
 return labelGrokRoomRow(await new Response(res.stream).json() as GrokQueueRow);
}
export async function saveGrokProduct(product:Record<string,unknown>):Promise<GrokQueueRow>{
 product=labelGrokRoomProduct(product);
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
   const res=await get(blob.pathname,{access:"private"});
   if(res)rows.push(labelGrokRoomRow(await new Response(res.stream).json() as GrokQueueRow));
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
