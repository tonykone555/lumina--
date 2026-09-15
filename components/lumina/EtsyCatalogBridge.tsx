"use client";

import {useEffect} from "react";

type EtsyProduct={id:string;title:string;brand:string;price:number|null;currency?:string;image:string;images?:string[];url?:string;tags?:string[];source?:string;variants?:unknown[];description?:string;supplierPrice?:number;retailPrice?:number;pricingMode?:string;klarna?:unknown;rating?:number|null;reviewCount?:number;reviews?:unknown[]};
let etsySelected=false;

/** Data adapter only. It renders no Etsy UI: Etsy products are normalized into the
 * same catalog response consumed by LuminaWorld, so the existing lv4 product
 * bubbles/stage are reused exactly like the other marketplace sources. */
export default function EtsyCatalogBridge(){
 useEffect(()=>{
  const originalFetch=window.fetch.bind(window);
  const onSource=(event:Event)=>{etsySelected=(event as CustomEvent<{source?:string}>).detail?.source==="etsy"};
  window.addEventListener("ynot:catalog-source",onSource as EventListener);
  window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
   const raw=typeof input==="string"?input:input instanceof URL?input.toString():input.url;
   if(!etsySelected||!raw.startsWith("/api/catalog?"))return originalFetch(input,init);
   const sourceUrl=new URL(raw,window.location.origin),q=sourceUrl.searchParams.get("q")||"gifts",direction=sourceUrl.searchParams.get("direction")||"",page=sourceUrl.searchParams.get("page")||"0",country=sourceUrl.searchParams.get("country")||"FR";
   const params=new URLSearchParams({q:[q,direction].filter(Boolean).join(", "),page,country,currency:"EUR"});
   const response=await originalFetch(`/api/etsy?${params.toString()}`,{...init,cache:"no-store"});
   const data=await response.clone().json().catch(()=>({}));
   if(!response.ok)return response;
   const products=(Array.isArray(data.products)?data.products:[]).map((product:EtsyProduct)=>({...product,source:"etsy-marketplace",tags:["Etsy",...(product.tags||[])]}));
   return new Response(JSON.stringify({source:"etsy-marketplace",sources:["etsy-marketplace"],market:"lumina",luminaSource:"shopify",products,pagination:{has_next_page:products.length>=24,next_cursor:null},error:products.length?undefined:"No Etsy products found for this search yet."}),{status:200,headers:{"Content-Type":"application/json"}});
  }) as typeof window.fetch;
  return()=>{window.removeEventListener("ynot:catalog-source",onSource as EventListener);window.fetch=originalFetch;etsySelected=false};
 },[]);
 return null;
}
