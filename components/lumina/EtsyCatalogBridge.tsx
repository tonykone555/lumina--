"use client";

import {useEffect} from "react";

type EtsyProduct={id:string;title:string;brand:string;price:number|null;currency?:string;image:string;images?:string[];url?:string;tags?:string[];source?:string;variants?:unknown[];description?:string;supplierPrice?:number;retailPrice?:number;pricingMode?:string;klarna?:unknown;rating?:number|null;reviewCount?:number;reviews?:unknown[]};
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

/** Data adapter only: Etsy results are fed into LuminaWorld's existing product
 * array so Etsy uses the exact same native YNOT bubbles, stage and interactions. */
export default function EtsyCatalogBridge(){
 useEffect(()=>{
  const originalFetch=window.fetch.bind(window);
  const onSource=(event:Event)=>{etsySelected=(event as CustomEvent<{source?:string}>).detail?.source==="etsy"};
  window.addEventListener("ynot:catalog-source",onSource as EventListener);
  window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
   const raw=typeof input==="string"?input:input instanceof URL?input.toString():input.url;
   if(!etsySelected||!raw.startsWith("/api/catalog?"))return originalFetch(input,init);
   const sourceUrl=new URL(raw,window.location.origin),q=etsyQuery(sourceUrl.searchParams.get("q")||""),direction=sourceUrl.searchParams.get("direction")||"",pageRaw=sourceUrl.searchParams.get("page")||"0",country=sourceUrl.searchParams.get("country")||"FR";
   const currentPage=Math.max(0,Number(pageRaw)||0);
   const params=new URLSearchParams({q:[q,direction].filter(Boolean).join(", "),page:String(currentPage),country,currency:"EUR"});
   const response=await originalFetch(`/api/etsy?${params.toString()}`,{...init,cache:"no-store"});
   const data=await response.clone().json().catch(()=>({}));
   if(!response.ok)return response;
   const products=(Array.isArray(data.products)?data.products:[]).map((product:EtsyProduct)=>({...product,source:"etsy-marketplace",tags:["Etsy",...(product.tags||[])]}));
   const total=Math.max(0,Number(data.total||0));
   const hasNext=total>0?((currentPage+1)*24<total):products.length>=24;
   return new Response(JSON.stringify({source:"etsy-marketplace",sources:["etsy-marketplace"],market:"lumina",luminaSource:"shopify",products,pagination:{has_next_page:hasNext,next_cursor:hasNext?`etsy:${currentPage+1}`:null},error:products.length?undefined:"No Etsy products found for this search yet."}),{status:200,headers:{"Content-Type":"application/json"}});
  }) as typeof window.fetch;
  return()=>{window.removeEventListener("ynot:catalog-source",onSource as EventListener);window.fetch=originalFetch;etsySelected=false};
 },[]);
 return null;
}
