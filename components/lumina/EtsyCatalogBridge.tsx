"use client";

import {useEffect} from "react";

type EtsyProduct={id:string;listingId?:number;title:string;brand:string;price:number|null;currency?:string;image:string;images?:string[];url?:string;tags?:string[];source?:string;variants?:unknown[];description?:string;supplierPrice?:number;retailPrice?:number;pricingMode?:string;klarna?:unknown;rating?:number|null;reviewCount?:number;reviews?:unknown[]};
declare global{interface Window{__ynotEtsyProducts?:Record<string,EtsyProduct>}}
let etsySelected=false;
const ETSY_CATEGORY_QUERIES:[RegExp,string][]=[
 [/fashion|dress|shoes|accessories/i,"women clothing dresses jewelry accessories"],
 [/fitness|activewear|recovery|training/i,"activewear workout accessories fitness"],
 [/beauty|skincare|self care/i,"skincare beauty self care"],
 [/hair care|styling tools|scalp/i,"hair accessories hair care styling"],
 [/home furniture|lighting|decor/i,"home decor wall art furniture lighting"],
 [/tech gadgets|audio|phone accessories/i,"tech accessories phone accessories gifts"],
 [/interesting trending products|worth discovering/i,"handmade gifts jewelry clothing home decor"]
];
function etsyQuery(raw:string){const clean=raw.trim();for(const [pattern,replacement] of ETSY_CATEGORY_QUERIES)if(pattern.test(clean))return replacement;return clean||"handmade gifts"}
function remember(products:EtsyProduct[]){const map=window.__ynotEtsyProducts||{};for(const product of products){map[String(product.id||"").toLowerCase()]=product;map[String(product.title||"").trim().toLowerCase()]=product}window.__ynotEtsyProducts=map}
function dedupe(products:EtsyProduct[]){const seen=new Set<string>();return products.filter(product=>{const key=String(product.id||product.url||product.title);if(!key||seen.has(key))return false;seen.add(key);return true})}

/** Etsy results are fed into the native YNOT world in larger batches so the
 * spatial product field stays dense instead of appearing nearly empty. */
export default function EtsyCatalogBridge(){
 useEffect(()=>{
  const originalFetch=window.fetch.bind(window);
  const onSource=(event:Event)=>{etsySelected=(event as CustomEvent<{source?:string}>).detail?.source==="etsy"};
  const onMarketClick=(event:Event)=>{const target=event.target as Element|null;if(target?.closest?.(".lv4-market-toggle .ebay"))etsySelected=false};
  window.addEventListener("ynot:catalog-source",onSource as EventListener);
  document.addEventListener("click",onMarketClick,true);
  window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
   const raw=typeof input==="string"?input:input instanceof URL?input.toString():input.url;
   if(!raw.startsWith("/api/catalog?"))return originalFetch(input,init);
   const sourceUrl=new URL(raw,window.location.origin);
   if(sourceUrl.searchParams.get("market")==="ebay"){
    etsySelected=false;
    return originalFetch(input,init);
   }
   if(!etsySelected)return originalFetch(input,init);
   const q=etsyQuery(sourceUrl.searchParams.get("q")||""),direction=sourceUrl.searchParams.get("direction")||"",pageRaw=sourceUrl.searchParams.get("page")||"0",country=sourceUrl.searchParams.get("country")||"FR",cursor=sourceUrl.searchParams.get("cursor")||"";
   const cursorMatch=cursor.match(/^etsy:(\d+)$/),requestedPage=Math.max(0,Number(pageRaw)||0),startPage=cursorMatch?Number(cursorMatch[1]):requestedPage;
   const batchSize=4;
   const fetchPage=async(page:number)=>{
    const params=new URLSearchParams({q:[q,direction].filter(Boolean).join(", "),page:String(page),country,currency:"EUR"});
    const response=await originalFetch(`/api/etsy?${params.toString()}`,{...init,cache:"no-store"});
    const data=await response.clone().json().catch(()=>({}));
    return{response,data,page};
   };
   const pages=await Promise.all(Array.from({length:batchSize},(_,index)=>fetchPage(startPage+index)));
   const firstFailure=pages.find(entry=>!entry.response.ok);
   if(firstFailure&&pages.every(entry=>!entry.response.ok))return firstFailure.response;
   const products=dedupe(pages.flatMap(entry=>Array.isArray(entry.data.products)?entry.data.products:[]).map((product:EtsyProduct)=>({...product,source:"etsy-marketplace",tags:["Etsy",...(product.tags||[])]})));
   remember(products);
   const total=Math.max(0,...pages.map(entry=>Number(entry.data.total||0)));
   const nextPage=startPage+batchSize,hasNext=total>0?nextPage*24<total:pages.some(entry=>Array.isArray(entry.data.products)&&entry.data.products.length>=24);
   return new Response(JSON.stringify({source:"etsy-marketplace",sources:["etsy-marketplace"],market:"lumina",luminaSource:"shopify",products,pagination:{has_next_page:hasNext,next_cursor:hasNext?`etsy:${nextPage}`:null},error:products.length?undefined:"No Etsy products found for this search yet."}),{status:200,headers:{"Content-Type":"application/json"}});
  }) as typeof window.fetch;
  return()=>{window.removeEventListener("ynot:catalog-source",onSource as EventListener);document.removeEventListener("click",onMarketClick,true);window.fetch=originalFetch;etsySelected=false};
 },[]);
 return null;
}
