"use client";
import {useLayoutEffect} from "react";

type P={id?:string;title?:string;brand?:string;merchant?:string;source?:string;image?:string;url?:string;verifiedMerchant?:boolean;[key:string]:unknown};
const norm=(v:unknown)=>String(v||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function key(p:P){return `${norm(p.title)}|${norm(p.brand||p.merchant)}`}
function interleave(a:P[],b:P[]){const out:P[]=[];const seen=new Set<string>();const max=Math.max(a.length,b.length);for(let i=0;i<max;i++){/* recognizable Channel3 retailers get a visible but balanced position */for(const p of [b[i],a[i]]){if(!p?.title||!p.image)continue;const k=key(p);if(!k||seen.has(k))continue;seen.add(k);out.push(p)}}return out}
function isCatalog(input:RequestInfo|URL){const u=typeof input==="string"?input:input instanceof URL?input.toString():input.url;return u.includes("/api/catalog")&&!u.includes("room_channel3=0")}
function queryFrom(input:RequestInfo|URL){try{const raw=typeof input==="string"?input:input instanceof URL?input.toString():input.url;const u=new URL(raw,window.location.origin);return u.searchParams.get("q")||""}catch{return""}}
const HOME=/\b(sofa|couch|sectional|loveseat|chair|armchair|table|desk|bed|mattress|cabinet|dresser|wardrobe|shelf|sideboard|console|bench|stool|ottoman|rug|carpet|lamp|light|mirror|planter|plant|decor|furniture|home|kitchen|dining|storage|bookcase|bookshelf)\b/i;

export default function RoomChannel3Bridge(){
 useLayoutEffect(()=>{
  const original=window.fetch.bind(window);let lastPremiumAt=0;
  window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
   if(!isCatalog(input))return original(input,init);
   const basePromise=original(input,init),q=queryFrom(input);if(!q||!HOME.test(q))return basePromise;
   /* QuickRoom fires several synonym searches together. Spend one Channel3 search for that
      selection, not one credit for every synonym. The server response itself is cached too. */
   const now=Date.now();if(now-lastPremiumAt<1800)return basePromise;lastPremiumAt=now;
   try{const [base,c3]=await Promise.all([basePromise,original(`/api/channel3?q=${encodeURIComponent(q)}&country=FR&limit=24`,{cache:"force-cache"})]);const [baseData,c3Data]=await Promise.all([base.clone().json().catch(()=>({})),c3.json().catch(()=>({}))]);const existing=Array.isArray(baseData?.products)?baseData.products:[],external=Array.isArray(c3Data?.products)?c3Data.products:[];if(!external.length)return base;const products=interleave(existing,external),merged={...baseData,products,sources:[...new Set([...(Array.isArray(baseData?.sources)?baseData.sources:[]),"channel3"])],roomDiscovery:{existing:existing.length,majorRetailers:external.length,total:products.length}};return new Response(JSON.stringify(merged),{status:base.status,headers:{"content-type":"application/json","cache-control":"no-store"}})}catch{return basePromise}
  }) as typeof fetch;
  return()=>{window.fetch=original};
 },[]);return null;
}
