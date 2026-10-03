"use client";

import {useEffect} from "react";

type Product={id?:string;title?:string;brand?:string;image?:string;images?:string[];[key:string]:unknown};
type CatalogPayload={products?:Product[];pagination?:Record<string,unknown>;[key:string]:unknown};

const INITIAL_ROW_TARGET=18;
const PRODUCTS_PER_ROW=10;
const INITIAL_PRODUCT_TARGET=INITIAL_ROW_TARGET*PRODUCTS_PER_ROW;
const EXPANSION_DIRECTIONS=["more like this","alternative styles","fresh finds"];
const PREFETCH_IMAGES=48;
const responseCache=new Map<string,{at:number,payload:CatalogPayload}>();
const CACHE_MS=90_000;

function productKey(product:Product){const id=String(product?.id||"").trim();if(id)return `id:${id}`;return `copy:${String(product?.title||"").toLowerCase().trim()}|${String(product?.brand||"").toLowerCase().trim()}`}
function mergeProducts(groups:Product[][]){const seen=new Set<string>(),merged:Product[]=[];for(const group of groups){for(const product of group){const key=productKey(product);if(!key||seen.has(key))continue;seen.add(key);merged.push(product);if(merged.length>=INITIAL_PRODUCT_TARGET)return merged}}return merged}
function withTimeout<T>(promise:Promise<T>,ms:number):Promise<T|null>{return new Promise(resolve=>{const timer=window.setTimeout(()=>resolve(null),ms);promise.then(value=>{window.clearTimeout(timer);resolve(value)}).catch(()=>{window.clearTimeout(timer);resolve(null)})})}
function imageUrls(products:Product[]){const urls:string[]=[];const seen=new Set<string>();for(const product of products){for(const value of [product.image,...(product.images||[]).slice(0,1)]){const url=String(value||"").trim();if(!url||seen.has(url))continue;seen.add(url);urls.push(url);if(urls.length>=PREFETCH_IMAGES)return urls}}return urls}
function prefetchImages(products:Product[]){const run=()=>{for(const url of imageUrls(products)){const image=new Image();image.decoding="async";image.fetchPriority="low";image.src=url}};const w=window as Window&{requestIdleCallback?:(cb:()=>void,opts?:{timeout:number})=>number};if(typeof w.requestIdleCallback==="function")w.requestIdleCallback(run,{timeout:650});else window.setTimeout(run,30)}
function jsonResponse(payload:CatalogPayload,status=200,headers?:HeadersInit){const h=new Headers(headers);h.set("Content-Type","application/json; charset=utf-8");h.set("X-YNOT-Search-Accelerated","1");return new Response(JSON.stringify(payload),{status,headers:h})}

export default function CatalogSearchAccelerator(){
 useEffect(()=>{
  const originalFetch=window.fetch.bind(window);
  const acceleratedFetch:typeof window.fetch=async(input,init)=>{
   const raw=typeof input==="string"?input:input instanceof URL?input.toString():input.url;
   let url:URL;try{url=new URL(raw,window.location.origin)}catch{return originalFetch(input as RequestInfo|URL,init)}
   const isCatalog=url.origin===window.location.origin&&url.pathname==="/api/catalog";
   const method=String(init?.method||(typeof input!=="string"&&!(input instanceof URL)?input.method:"GET")||"GET").toUpperCase();
   const source=url.searchParams.get("source")||"shopify",page=Number(url.searchParams.get("page")||"0");
   const shouldAccelerate=isCatalog&&method==="GET"&&url.searchParams.get("market")!=="ebay"&&source==="shopify"&&page===0&&!url.searchParams.get("cursor")&&!url.searchParams.get("direction");
   if(!shouldAccelerate)return originalFetch(input as RequestInfo|URL,init);

   const cacheKey=`${url.pathname}?${[...url.searchParams.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join("&")}`;
   const cached=responseCache.get(cacheKey);
   if(cached&&Date.now()-cached.at<CACHE_MS){prefetchImages(cached.payload.products||[]);return jsonResponse({...cached.payload,accelerated:true,cached:true})}

   /* Important: return the real first page immediately. The old accelerator waited
      for all three expansion calls before the UI could paint even the first bubble. */
   const primary=await originalFetch(input as RequestInfo|URL,init);
   if(!primary.ok)return primary;
   let primaryData:CatalogPayload;try{primaryData=await primary.clone().json() as CatalogPayload}catch{return primary}
   const baseProducts=Array.isArray(primaryData.products)?primaryData.products:[];
   prefetchImages(baseProducts);
   responseCache.set(cacheKey,{at:Date.now(),payload:primaryData});

   /* Warm the next bubble rows in parallel for LuminaWorld's follow-up fetches,
      but never block the first response on them. */
   void Promise.all(EXPANSION_DIRECTIONS.map(async direction=>{
    const expansion=new URL(url.toString());expansion.searchParams.set("direction",direction);expansion.searchParams.set("page","0");
    const payload=await withTimeout(originalFetch(expansion.toString(),{...init,cache:"no-store"}).then(async response=>response.ok?await response.json() as CatalogPayload:null),2200);
    if(payload?.products?.length)prefetchImages(payload.products);
    return payload;
   })).then(extras=>{
    const merged=mergeProducts([baseProducts,...extras.map(payload=>Array.isArray(payload?.products)?payload!.products!:[])]);
    if(merged.length>baseProducts.length){const warmed={...primaryData,products:merged,accelerated:true,initial_target:INITIAL_PRODUCT_TARGET};responseCache.set(cacheKey,{at:Date.now(),payload:warmed});window.dispatchEvent(new CustomEvent("ynot:catalog-warmed",{detail:{query:url.searchParams.get("q")||"",count:merged.length}}))}
   }).catch(()=>{});

   const headers=new Headers(primary.headers);headers.set("X-YNOT-Search-Accelerated","stream-first");
   return jsonResponse({...primaryData,accelerated:true,stream_first:true},primary.status,headers);
  };
  window.fetch=acceleratedFetch;
  return()=>{if(window.fetch===acceleratedFetch)window.fetch=originalFetch};
 },[]);
 return null;
}
