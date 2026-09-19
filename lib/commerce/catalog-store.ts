import type { CatalogFeedProduct } from "./catalog-feed";

function supabase(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("SUPABASE_NOT_CONFIGURED");
  return{url:url.replace(/\/$/,""),key};
}

async function request(path:string,init:RequestInit={}){
  const {url,key}=supabase();
  const res=await fetch(`${url}/rest/v1/${path}`,{
    ...init,
    headers:{
      apikey:key,
      Authorization:`Bearer ${key}`,
      "Content-Type":"application/json",
      Prefer:"resolution=merge-duplicates,return=representation",
      ...(init.headers||{})
    },
    cache:"no-store"
  });
  if(!res.ok)throw new Error(`CATALOG_STORE_${res.status}:${await res.text()}`);
  const text=await res.text();
  return text?JSON.parse(text):[];
}

function chunks<T>(items:T[],size=200){
  const out:T[][]=[];
  for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));
  return out;
}

export async function persistCatalogProducts(products:CatalogFeedProduct[]){
  if(!products.length)return{products:0,offers:0};
  const now=new Date().toISOString();
  const productRows=products.map(p=>({
    ynot_id:p.ynotId,
    country:p.country,
    category:p.category,
    title:p.title,
    original_title:p.originalTitle,
    brand:p.brand,
    source_brand:p.sourceBrand||null,
    image_url:p.image,
    image_urls:p.images,
    ynot_price:p.ynotPrice,
    currency:p.sourceCurrency,
    ad_eligible:p.adEligible,
    intent_tags:p.intentTags,
    price_position:p.pricePosition||null,
    active:true,
    source_product_id:p.sourceProductId,
    source_variant_id:p.sourceVariantId||null,
    best_source_url:p.sourceUrl,
    best_supplier_domain:p.merchantDomain,
    source_price:p.sourcePrice,
    shipping_reserve:p.shippingReserve,
    gross_contribution:p.grossContribution,
    margin_pct:p.marginPct,
    reliability_score:p.reliabilityScore,
    routing_score:p.routingScore,
    supplier_offer_count:p.supplierOfferCount,
    fingerprint:p.fingerprint,
    last_seen_at:now,
    updated_at:now
  }));

  const offerRows=products.flatMap(p=>p.supplierOffers.map(o=>({
    ynot_id:p.ynotId,
    merchant_domain:o.merchantDomain,
    merchant_name:o.merchantName,
    source_url:o.sourceUrl,
    source_product_id:o.sourceProductId,
    source_variant_id:o.sourceVariantId||"",
    source_price:o.sourcePrice,
    source_currency:o.sourceCurrency,
    shipping_reserve:o.shippingReserve,
    ynot_price:o.ynotPrice,
    gross_contribution:o.grossContribution,
    margin_pct:o.marginPct,
    reliability_score:o.reliabilityScore,
    routing_score:o.routingScore,
    updated_at:now
  })));

  for(const batch of chunks(productRows)){
    await request("ynot_catalog_products?on_conflict=ynot_id",{method:"POST",body:JSON.stringify(batch)});
  }
  for(const batch of chunks(offerRows)){
    await request("ynot_catalog_supplier_offers?on_conflict=ynot_id,source_product_id,source_variant_id",{method:"POST",body:JSON.stringify(batch)});
  }
  return{products:productRows.length,offers:offerRows.length};
}

export async function getCatalogProduct(ynotId:string){
  const rows=await request(`ynot_catalog_products?ynot_id=eq.${encodeURIComponent(ynotId)}&active=eq.true&limit=1`);
  if(!rows[0])return null;
  const offers=await request(`ynot_catalog_supplier_offers?ynot_id=eq.${encodeURIComponent(ynotId)}&select=*&order=routing_score.desc&limit=8`);
  return{...rows[0],supplier_offers:offers};
}

export async function listCatalogProducts(limit=5000){
  return request(`ynot_catalog_products?active=eq.true&ad_eligible=eq.true&select=*&order=routing_score.desc&limit=${Math.max(1,Math.min(10000,limit))}`);
}

export async function recordCommerceEvent(input:{
  eventType:string;
  ynotId?:string|null;
  source?:string|null;
  country?:string|null;
  value?:number|null;
  currency?:string|null;
  sessionId?:string|null;
  metadata?:Record<string,unknown>;
}){
  const row={
    event_type:input.eventType.slice(0,80),
    ynot_id:input.ynotId||null,
    source:input.source||null,
    country:input.country||null,
    value:input.value??null,
    currency:input.currency||null,
    session_id:input.sessionId||null,
    metadata:input.metadata||{}
  };
  const rows=await request("ynot_commerce_events",{method:"POST",body:JSON.stringify(row)});
  return rows[0]||row;
}
