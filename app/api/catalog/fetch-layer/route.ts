import { NextRequest,NextResponse } from "next/server";
import { selectCanonicalProducts,type CanonicalProduct } from "@/lib/commerce/multi-source";
export const runtime="nodejs";

async function json(url:string,ms=5000){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);
 try{const r=await fetch(url,{cache:"no-store",signal:controller.signal});if(!r.ok)throw new Error(String(r.status));return await r.json()}finally{clearTimeout(timer)}
}
function products(v:any):CanonicalProduct[]{return Array.isArray(v?.products)?v.products:[]}

/** Fast fan-out over YNOT's normalized catalogue adapters. One failed source never blocks the others. */
export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get("q")||"").slice(0,300);
 const country=(req.nextUrl.searchParams.get("country")||"FR").toUpperCase().slice(0,2);
 if(!q)return NextResponse.json({products:[],sources:[]});
 const base=req.nextUrl.origin;
 const adapters=[
  {name:"shopify",url:`${base}/api/catalog?q=${encodeURIComponent(q)}&country=${country}&source=shopify`},
  {name:"amazon",url:`${base}/api/catalog?q=${encodeURIComponent(q)}&country=${country}&source=amazon`},
  {name:"ebay",url:`${base}/api/catalog?q=${encodeURIComponent(q)}&country=${country}&market=ebay`}
 ];
 const settled=await Promise.allSettled(adapters.map(a=>json(a.url)));
 const sourceStatus=adapters.map((a,i)=>({source:a.name,ok:settled[i].status==="fulfilled"}));
 const all=settled.flatMap(r=>r.status==="fulfilled"?products(r.value):[]);
 const canonical=selectCanonicalProducts(all);
 return NextResponse.json({source:"ynot-fetch-layer",sources:sourceStatus,query:q,country,products:canonical,count:canonical.length},{headers:{"Cache-Control":"s-maxage=20, stale-while-revalidate=120"}});
}
