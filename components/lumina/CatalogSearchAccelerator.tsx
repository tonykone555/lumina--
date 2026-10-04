"use client";

import {useEffect} from "react";
import ProductImageScanBridge from "./ProductImageScanBridge";

type Product={id?:string;title?:string;brand?:string;image?:string;images?:string[];source?:string;[key:string]:unknown};
type CatalogPayload={products?:Product[];pagination?:Record<string,unknown>;sources?:string[];[key:string]:unknown};

const INITIAL_ROW_TARGET=18;
const PRODUCTS_PER_ROW=10;
const INITIAL_PRODUCT_TARGET=INITIAL_ROW_TARGET*PRODUCTS_PER_ROW;
const EXPANSION_DIRECTIONS=["more like this","alternative styles","fresh finds"];
const PREFETCH_IMAGES=48;
const responseCache=new Map<string,{at:number,payload:CatalogPayload}>();
const CACHE_MS=90_000;

function normalizedCopy(product:Product){return `${String(product?.title||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}|${String(product?.brand||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}`}
function productKey(product:Product){const copy=normalizedCopy(product);if(copy!=="|")return `copy:${copy}`;const id=String(product?.id||"").trim();return id?`id:${id}`:""}
function mergeProducts(groups:Product[][]){const seen=new Set<string>(),merged:Product[]=[];for(const group of groups){for(const product of group){const key=productKey(product);if(!key||seen.has(key))continue;seen.add(key);merged.push(product);if(merged.length>=INITIAL_PRODUCT_TARGET)return merged}}return merged}
function interleave(primary:Product[],channel3:Product[]){if(!channel3.length)return primary;const out:Product[]=[],seen=new Set<string>();let a=0,b=0;while(out.length<INITIAL_PRODUCT_TARGET&&(a<primary.length||b<channel3.length)){for(let i=0;i<3&&a<primary.length;i++,a++){const p=primary[a],k=productKey(p);if(k&&!seen.has(k)){seen.add(k);out.push(p)}}if(b<channel3.length){const p=channel3[b++],k=productKey(p);if(k&&!seen.has(k)){seen.add(k);out.push({...p,source:"channel3",verifiedMerchant:true})}}}return out}
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
   const shouldAccelerate=isCatalog&&method==="GET"&&url.searchParams.get("market")!=="ebay"&&(source==="shopify"||source==="all")&&page===0&&!url.searchParams.get("cursor")&&!url.searchParams.get("direction");
   if(!shouldAccelerate)return originalFetch(input as RequestInfo|URL,init);
   const cacheKey=`${url.pathname}?${[...url.searchParams.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join("&")}`;
   const cached=responseCache.get(cacheKey);
   if(cached&&Date.now()-cached.at<CACHE_MS){prefetchImages(cached.payload.products||[]);return jsonResponse({...cached.payload,accelerated:true,cached:true})}
   const primaryPromise=originalFetch(input as RequestInfo|URL,init);
   const c3Url=new URL("/api/channel3",window.location.origin);c3Url.searchParams.set("q",url.searchParams.get("q")||"");c3Url.searchParams.set("country",url.searchParams.get("country")||"FR");c3Url.searchParams.set("limit","100");
   const channel3Promise=withTimeout(originalFetch(c3Url.toString(),{cache:"no-store"}).then(async r=>r.ok?await r.json() as CatalogPayload:null),2600);
   const primary=await primaryPromise;if(!primary.ok)return primary;
   let primaryData:CatalogPayload;try{primaryData=await primary.clone().json() as CatalogPayload}catch{return primary}
   const baseProducts=Array.isArray(primaryData.products)?primaryData.products:[];
   const channel3Data=await channel3Promise;const channel3Products=Array.isArray(channel3Data?.products)?channel3Data!.products!.map(p=>({...p,source:"channel3",verifiedMerchant:true})):[];
   const liveProducts=interleave(baseProducts,channel3Products);const sources=[...new Set([...(primaryData.sources||[]),...(channel3Products.length?["channel3"]:[])])];
   prefetchImages(liveProducts);const livePayload={...primaryData,products:liveProducts,sources,channel3_count:channel3Products.length,accelerated:true,stream_first:true};responseCache.set(cacheKey,{at:Date.now(),payload:livePayload});
   void Promise.all(EXPANSION_DIRECTIONS.map(async direction=>{const expansion=new URL(url.toString());expansion.searchParams.set("direction",direction);expansion.searchParams.set("page","0");const payload=await withTimeout(originalFetch(expansion.toString(),{...init,cache:"no-store"}).then(async response=>response.ok?await response.json() as CatalogPayload:null),2200);if(payload?.products?.length)prefetchImages(payload.products);return payload})).then(extras=>{const expanded=mergeProducts([liveProducts,...extras.map(payload=>Array.isArray(payload?.products)?payload!.products!:[])]);const merged=interleave(expanded,channel3Products);if(merged.length>liveProducts.length){const warmed={...livePayload,products:merged,initial_target:INITIAL_PRODUCT_TARGET};responseCache.set(cacheKey,{at:Date.now(),payload:warmed});window.dispatchEvent(new CustomEvent("ynot:catalog-warmed",{detail:{query:url.searchParams.get("q")||"",count:merged.length,channel3:channel3Products.length}}))}}).catch(()=>{});
   const headers=new Headers(primary.headers);headers.set("X-YNOT-Search-Accelerated","channel3-blend");headers.set("X-YNOT-Channel3-Count",String(channel3Products.length));return jsonResponse(livePayload,primary.status,headers);
  };
  window.fetch=acceleratedFetch;return()=>{if(window.fetch===acceleratedFetch)window.fetch=originalFetch};
 },[]);
 return <ProductImageScanBridge/>;
}
