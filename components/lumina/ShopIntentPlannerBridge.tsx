"use client";

import {useEffect,useRef} from "react";

type IntentDetail={query?:string;tags?:string[];category?:string;source?:string;country?:string};

function clean(value:unknown){return String(value??"").replace(/\s+/g," ").trim()}
function shopperCountry(){try{const saved=JSON.parse(localStorage.getItem("ynot-region")||"null") as {country?:string}|null;return String(saved?.country||"FR").toUpperCase().slice(0,2)}catch{return"FR"}}

export default function ShopIntentPlannerBridge(){
 const serial=useRef(0),lastSignature=useRef("");
 useEffect(()=>{
  const run=async(detail:IntentDetail,sourceFallback:string)=>{
   const query=clean(detail.query),category=clean(detail.category),tags=Array.isArray(detail.tags)?detail.tags.map(clean).filter(Boolean):[];
   if(!query&&!category&&!tags.length)return;
   const signature=JSON.stringify({query,category,tags});
   if(signature===lastSignature.current)return;
   lastSignature.current=signature;
   const request=++serial.current;
   window.dispatchEvent(new CustomEvent("shop:intent-planning",{detail:{loading:true,query,category,tags}}));
   try{
    const response=await fetch("/api/shop/intent-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({source:detail.source||sourceFallback,query,category,tags,country:detail.country||shopperCountry()})});
    const data=await response.json().catch(()=>({}));
    if(request!==serial.current||!response.ok)return;
    // Gemini is deliberately enrichment-only here. The exact category/search/tag query
    // is allowed to load immediately through the existing catalogue path so the first
    // products stay fast and coherent. Consumers can use this plan for clusters,
    // suggestions and later exploration without replacing the live product query.
    window.dispatchEvent(new CustomEvent("shop:intent-plan",{detail:{...data,original:{query,category,tags},enrichmentOnly:true}}));
   }finally{
    if(request===serial.current)window.dispatchEvent(new CustomEvent("shop:intent-planning",{detail:{loading:false,query,category,tags}}));
   }
  };
  const onSearch=(event:Event)=>void run((event as CustomEvent<IntentDetail>).detail||{},"search");
  const onTags=(event:Event)=>{
   const detail=(event as CustomEvent<IntentDetail>).detail||{};
   if(!detail.category&&!detail.tags?.length)return;
   void run(detail,detail.tags?.length?"tags":"category");
  };
  const onIntent=(event:Event)=>void run((event as CustomEvent<IntentDetail>).detail||{},"category");
  window.addEventListener("shop:tag-search",onSearch as EventListener);
  window.addEventListener("shop:tags-changed",onTags as EventListener);
  window.addEventListener("shop:intent-request",onIntent as EventListener);
  return()=>{window.removeEventListener("shop:tag-search",onSearch as EventListener);window.removeEventListener("shop:tags-changed",onTags as EventListener);window.removeEventListener("shop:intent-request",onIntent as EventListener)};
 },[]);
 // Product placeholders used to render up to hundreds of translucent circles while
 // catalogue requests were in flight. They add paint/animation work and visually sit
 // behind real products, so keep them entirely out of the rendered layer.
 return <style>{`.lv4-product-placeholder{display:none!important;animation:none!important}`}</style>;
}
