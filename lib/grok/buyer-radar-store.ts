import {createHash} from "node:crypto";
import {get,list,put} from "@vercel/blob";
import {discoverBuyerSignals,type BuyerSignal} from "@/lib/grok/buyer-radar";
const prefix="buyer-radar/v1/";
export type SavedBuyerSignal=BuyerSignal&{id:string;country:"UK"|"US";first_seen:string;last_seen:string;status:"research"|"qualified"|"dismissed";outreach_sent:false};
const key=(url:string)=>prefix+createHash("sha256").update(url).digest("hex")+".json";
export async function getBuyerSignals(limit=80){
 const rows:SavedBuyerSignal[]=[];let cursor:string|undefined;
 do{const page=await list({prefix,limit:100,cursor});for(const b of page.blobs){const r=await get(b.pathname,{access:"private"});if(r){try{rows.push(await new Response(r.stream).json() as SavedBuyerSignal)}catch{}}}cursor=page.hasMore?page.cursor:undefined}while(cursor&&rows.length<500);
 return rows.sort((a,b)=>b.last_seen.localeCompare(a.last_seen)).slice(0,Math.min(150,Math.max(1,limit)));
}
export async function runBuyerRadar(){
 const jobs=([{country:"UK",intent:"wanted"},{country:"UK",intent:"apartment"},{country:"US",intent:"wanted"},{country:"US",intent:"apartment"},{country:"US",intent:"rental"},{country:"UK",intent:"rental"}] as const);
 const results=await Promise.all(jobs.map(j=>discoverBuyerSignals({...j,limit:8})));
 let created=0,refreshed=0,failed=0;const now=new Date().toISOString();
 // Only keep attributable public signals. News items remain research-only, not qualified customers.
 const seen=new Set<string>();
 for(let i=0;i<results.length;i++)for(const signal of results[i].items){
  const url=signal.url;if(seen.has(url))continue;seen.add(url);
  const pathname=key(url);
  try{const old=await get(pathname,{access:"private"});const prev=old?await new Response(old.stream).json() as SavedBuyerSignal:null;
   const row:SavedBuyerSignal={...signal,id:createHash("sha256").update(url).digest("hex"),country:jobs[i].country,
    first_seen:prev?.first_seen||now,last_seen:now,status:prev?.status||"research",outreach_sent:false};
   await put(pathname,JSON.stringify(row),{access:"private",allowOverwrite:true,contentType:"application/json",cacheControlMaxAge:60});
   prev?refreshed++:created++;
  }catch{failed++}
 }
 return {created,refreshed,failed,checked:results.map((r,i)=>({country:jobs[i].country,intent:jobs[i].intent,count:r.items.length,errors:r.source_status.filter(s=>s.error).length})),note:"Research signals only; no contacts sent or posts published."};
}
