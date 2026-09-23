import { NextRequest,NextResponse } from "next/server";
export const runtime="nodejs";

async function fetchJson(url:string,ms=6000){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);
 try{const r=await fetch(url,{cache:"no-store",signal:controller.signal});if(!r.ok)throw new Error(String(r.status));return await r.json()}finally{clearTimeout(timer)}
}
export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get("q")||"").slice(0,300);
 const id=(req.nextUrl.searchParams.get("id")||"").slice(0,240);
 const country=(req.nextUrl.searchParams.get("country")||"FR").toUpperCase().slice(0,2);
 if(!q&&!id)return NextResponse.json({error:"q or id required"},{status:400});
 const search=q||id;
 const base=req.nextUrl.origin;
 const data=await fetchJson(`${base}/api/catalog/fetch-layer?q=${encodeURIComponent(search)}&country=${country}`);
 const list=Array.isArray(data?.products)?data.products:[];
 const product=id?list.find((p:any)=>String(p.id)===id)||list[0]:list[0];
 if(!product)return NextResponse.json({product:null,error:"No live product found"},{status:200});
 return NextResponse.json({product,hydrated:true,offerCount:Number(product.supplierOfferCount||product.supplierOffers?.length||1),supplierOffers:product.supplierOffers||[]},{headers:{"Cache-Control":"s-maxage=15, stale-while-revalidate=60"}});
}
