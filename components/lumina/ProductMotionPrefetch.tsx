"use client";

import {useEffect} from "react";

type Media={product_id:string;media_type:string;video_url?:string|null;poster_url?:string|null;preset?:string|null;status:string};
type ProductMeta={id:string;title:string;image:string;category:string};

function meta(card:HTMLElement):ProductMeta|null{
 const id=String(card.dataset.productId||"").trim(),image=String(card.dataset.productImage||card.querySelector("img")?.getAttribute("src")||"").trim();
 if(!id||!image)return null;
 return{id,title:String(card.dataset.productTitle||""),image,category:String(card.dataset.productCategory||"")};
}
function scheduleIdle(fn:()=>void){
 const w=window as any;if(typeof w.requestIdleCallback==="function")return w.requestIdleCallback(fn,{timeout:500});
 return window.setTimeout(fn,80);
}

export default function ProductMotionPrefetch(){
 useEffect(()=>{
  const known=new Map<string,Media>(),queued=new Map<string,ProductMeta>(),inflight=new Set<string>();let flushTimer:number|undefined;

  function apply(card:HTMLElement,m:Media){
   if(m.video_url){
    let video=card.querySelector<HTMLVideoElement>("video.ynot-product-motion-video");
    if(!video){
     video=document.createElement("video");video.className="ynot-product-motion-video";video.muted=true;video.loop=true;video.playsInline=true;video.preload="metadata";video.setAttribute("aria-hidden","true");
     const host=card.querySelector<HTMLElement>("[data-motion-host]")||card;const img=host.querySelector("img");if(img)host.insertBefore(video,img);else host.prepend(video);
    }
    if(video.src!==m.video_url)video.src=m.video_url;
    if(m.poster_url)video.poster=m.poster_url;
    card.dataset.motionType="video";
   }else{
    card.dataset.motionType="fast";card.dataset.motionPreset=m.preset||"soft_float";
   }
   card.classList.add("ynot-motion-ready");
  }

  function flush(){
   flushTimer=undefined;
   const batch=[...queued.values()].filter(p=>!inflight.has(p.id)).slice(0,8);if(!batch.length)return;
   batch.forEach(p=>{queued.delete(p.id);inflight.add(p.id)});
   fetch("/api/catalog/media",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({products:batch}),keepalive:true})
    .then(r=>r.json()).then(d=>{const media=d?.media||{};for(const p of batch){const m=media[p.id] as Media|undefined;if(!m)continue;known.set(p.id,m);document.querySelectorAll<HTMLElement>(`[data-motion-surface="deals"][data-product-id="${CSS.escape(p.id)}"]`).forEach(card=>apply(card,m));}})
    .catch(()=>{})
    .finally(()=>{batch.forEach(p=>inflight.delete(p.id));if(queued.size)flushTimer=scheduleIdle(flush) as number});
  }

  function queue(card:HTMLElement){
   const p=meta(card);if(!p)return;
   const cached=known.get(p.id);if(cached){apply(card,cached);return}
   if(inflight.has(p.id)||queued.has(p.id))return;queued.set(p.id,p);
   if(flushTimer==null)flushTimer=scheduleIdle(flush) as number;
  }

  const prewarm=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)queue(entry.target as HTMLElement)}},{root:null,rootMargin:"1800px 900px 2400px 900px",threshold:0});
  const active=new IntersectionObserver(entries=>{for(const entry of entries){const card=entry.target as HTMLElement,video=card.querySelector<HTMLVideoElement>("video.ynot-product-motion-video");if(entry.isIntersecting){card.classList.add("ynot-motion-active");if(video)void video.play().catch(()=>{})}else{card.classList.remove("ynot-motion-active");if(video)video.pause()}}},{root:null,rootMargin:"240px",threshold:.08});

  function attach(root:ParentNode=document){
   root.querySelectorAll<HTMLElement>('[data-motion-surface="deals"][data-product-id]').forEach(card=>{if(card.dataset.motionObserved==="1")return;card.dataset.motionObserved="1";prewarm.observe(card);active.observe(card)});
  }
  attach();
  const mutation=new MutationObserver(records=>{for(const r of records)for(const node of r.addedNodes)if(node instanceof HTMLElement){if(node.matches('[data-motion-surface="deals"][data-product-id]'))attach(node.parentElement||document);else attach(node)}});
  mutation.observe(document.body,{childList:true,subtree:true});
  return()=>{mutation.disconnect();prewarm.disconnect();active.disconnect();if(flushTimer!=null)window.clearTimeout(flushTimer)};
 },[]);
 return null;
}