"use client";

import {useEffect} from "react";

type Product={id?:string;title?:string;brand?:string;[key:string]:unknown};
type CatalogPayload={products?:Product[];pagination?:Record<string,unknown>;[key:string]:unknown};

const INITIAL_ROW_TARGET=18;
const PRODUCTS_PER_ROW=10;
const INITIAL_PRODUCT_TARGET=INITIAL_ROW_TARGET*PRODUCTS_PER_ROW;
const EXPANSION_DIRECTIONS=["more like this","alternative styles","fresh finds"];

function productKey(product:Product){
 const id=String(product?.id||"").trim();
 if(id)return `id:${id}`;
 return `copy:${String(product?.title||"").toLowerCase().trim()}|${String(product?.brand||"").toLowerCase().trim()}`;
}

function mergeProducts(groups:Product[][]){
 const seen=new Set<string>(),merged:Product[]=[];
 for(const group of groups){
  for(const product of group){
   const key=productKey(product);
   if(!key||seen.has(key))continue;
   seen.add(key);
   merged.push(product);
   if(merged.length>=INITIAL_PRODUCT_TARGET)return merged;
  }
 }
 return merged;
}

function withTimeout<T>(promise:Promise<T>,ms:number):Promise<T|null>{
 return new Promise(resolve=>{
  const timer=window.setTimeout(()=>resolve(null),ms);
  promise.then(value=>{window.clearTimeout(timer);resolve(value)}).catch(()=>{window.clearTimeout(timer);resolve(null)});
 });
}

export default function CatalogSearchAccelerator(){
 useEffect(()=>{
  const originalFetch=window.fetch.bind(window);
  const acceleratedFetch:typeof window.fetch=async(input,init)=>{
   const raw=typeof input==="string"?input:input instanceof URL?input.toString():input.url;
   let url:URL;
   try{url=new URL(raw,window.location.origin)}catch{return originalFetch(input as RequestInfo|URL,init)}
   const isCatalog=url.origin===window.location.origin&&url.pathname==="/api/catalog";
   const method=String(init?.method||(typeof input!=="string"&&!(input instanceof URL)?input.method:"GET")||"GET").toUpperCase();
   const source=url.searchParams.get("source")||"shopify";
   const page=Number(url.searchParams.get("page")||"0");
   const shouldAccelerate=isCatalog&&method==="GET"&&url.searchParams.get("market")!=="ebay"&&source==="shopify"&&page===0&&!url.searchParams.get("cursor")&&!url.searchParams.get("direction")&&url.searchParams.get("category_load")!=="1";
   if(!shouldAccelerate)return originalFetch(input as RequestInfo|URL,init);

   const primaryPromise=originalFetch(input as RequestInfo|URL,init);
   const expansionPromises=EXPANSION_DIRECTIONS.map(direction=>{
    const expansion=new URL(url.toString());
    expansion.searchParams.set("direction",direction);
    expansion.searchParams.set("page","0");
    return withTimeout(originalFetch(expansion.toString(),{...init,cache:"no-store"}).then(async response=>response.ok?await response.json() as CatalogPayload:null),2800);
   });

   const primary=await primaryPromise;
   if(!primary.ok)return primary;
   let primaryData:CatalogPayload;
   try{primaryData=await primary.clone().json() as CatalogPayload}catch{return primary}
   const baseProducts=Array.isArray(primaryData.products)?primaryData.products:[];
   if(baseProducts.length>=INITIAL_PRODUCT_TARGET)return primary;

   const extras=await Promise.all(expansionPromises);
   const merged=mergeProducts([baseProducts,...extras.map(payload=>Array.isArray(payload?.products)?payload!.products!:[])]);
   if(merged.length<=baseProducts.length)return primary;

   const headers=new Headers(primary.headers);
   headers.set("Content-Type","application/json; charset=utf-8");
   headers.set("X-YNOT-Search-Accelerated","1");
   return new Response(JSON.stringify({...primaryData,products:merged,accelerated:true,initial_target:INITIAL_PRODUCT_TARGET}),{status:primary.status,statusText:primary.statusText,headers});
  };
  window.fetch=acceleratedFetch;
  return()=>{if(window.fetch===acceleratedFetch)window.fetch=originalFetch};
 },[]);
 return null;
}
