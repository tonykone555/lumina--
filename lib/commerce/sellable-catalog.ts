import type { CheckoutProduct } from "./checkout";

export type SellableCandidate=CheckoutProduct&{description?:string;images?:string[];tags?:string[];supplierPrice?:number;retailPrice?:number};

function supabase(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL;
 const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error("SUPABASE_NOT_CONFIGURED");
 return{url:url.replace(/\/$/,""),key};
}
function host(raw:string){try{return new URL(raw).hostname.toLowerCase().replace(/^www\./,"")}catch{return""}}
function money(n:unknown){const x=Number(n);return Number.isFinite(x)&&x>0?Math.round(x*100)/100:null}

export function researchCandidate(p:SellableCandidate){
 const supplier=money(p.supplierPrice??p.price),retail=money(p.retailPrice??p.price);
 const reasons:string[]=[];let score=100;
 if(!p.url||!p.url.startsWith("https://")){score-=100;reasons.push("invalid-source-url")}
 if(!p.image&&!p.images?.length){score-=35;reasons.push("missing-images")}
 if(!supplier){score-=100;reasons.push("invalid-source-price")}
 if(!retail){score-=100;reasons.push("invalid-ynot-price")}
 const marginPct=supplier&&retail?(retail-supplier)/retail:null;
 if(marginPct!=null&&marginPct<.12){score-=45;reasons.push("low-margin")}
 if(/staging|localhost|preview/i.test(host(p.url))){score-=100;reasons.push("non-production-merchant")}
 if(!p.title||p.title.length<3){score-=60;reasons.push("invalid-title")}
 const status=score>=70?"approved":score>=45?"needs_review":"rejected";
 return{status,score:Math.max(0,score),reasons,marginPct,supplierPrice:supplier,ynotPrice:retail,merchantDomain:host(p.url)} as const;
}

export async function persistCandidate(p:SellableCandidate){
 const r=researchCandidate(p);if(!r.supplierPrice)throw new Error("INVALID_SOURCE_PRICE");
 const {url,key}=supabase();
 const row={source:p.source||"shopify-global-catalog",source_product_id:String(p.id),source_variant_id:p.variantId?String(p.variantId):null,merchant_name:p.brand||null,merchant_domain:r.merchantDomain,source_url:p.url,title:p.title,description:p.description||null,image_urls:(p.images?.length?p.images:p.image?[p.image]:[]),supplier_price:r.supplierPrice,supplier_currency:String(p.currency||"EUR").toUpperCase(),ynot_price:r.ynotPrice,category:p.category||null,variants:p.variants||[],research_status:r.status,research_score:r.score,research_reasons:r.reasons,margin_pct:r.marginPct,last_research_at:new Date().toISOString(),updated_at:new Date().toISOString()};
 const res=await fetch(`${url}/rest/v1/ynot_sellable_products?on_conflict=source,source_product_id,source_variant_id`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(row),cache:"no-store"});
 if(!res.ok)throw new Error(`SELLABLE_CATALOG_WRITE_FAILED:${res.status}:${await res.text()}`);return{record:(await res.json())[0],research:r};
}
