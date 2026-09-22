"use client";

import {useEffect} from "react";

type Media={product_id:string;media_type:string;video_url?:string|null;poster_url?:string|null;preset?:string|null;status:string};
type ProductMeta={id:string;title:string;image:string;category:string;generateVideo:boolean};

function meta(card:HTMLElement):ProductMeta|null{
 const id=String(card.dataset.productId||"").trim(),image=String(card.dataset.productImage||card.querySelector("img")?.getAttribute("src")||"").trim();
 if(!id||!image)return null;
 return{id,title:String(card.dataset.productTitle||""),image,category:String(card.dataset.productCategory||""),generateVideo:card.dataset.videoGeneration==="search"};
}

function instantPreset(p:ProductMeta){
 const t=(p.category+" "+p.title).toLowerCase();
 if(/fashion|dress|shirt|jacket|coat|bag|apparel|clothing/.test(t))return"fashion_alive";
 if(/beauty|skin|serum|cream|hair|perfume|fragrance|jewel|watch/.test(t))return"beauty_alive";
 if(/home|decor|furniture|lamp|chair|sofa|table|rug/.test(t))return"context_push";
 if(/fitness|gym|sport|training/.test(t))return"active_float";
 if(/tech|gadget|phone|audio|accessor/.test(t))return"product_orbit";
 return"soft_float";
}

function applyInstantMotion(card:HTMLElement,p:ProductMeta){
 if(card.dataset.motionType==="video")return;
 card.dataset.motionType="fast";
 card.dataset.motionPreset=instantPreset(p);
 card.classList.add("ynot-motion-ready");
}
function scheduleIdle(fn:()=>void){
 const w=window as any;if(typeof w.requestIdleCallback==="function")return w.requestIdleCallback(fn,{timeout:220});
 return window.setTimeout(fn,28);
}

export default function ProductMotionPrefetch(){
 useEffect(()=>{
  const known=new Map<string,Media>(),queued=new Map<string,ProductMeta>(),inflight=new Set<string>(),videoTracked=new Map<string,ProductMeta>(),videoRequested=new Set<string>();let flushTimer:number|undefined,statusTimer:number|undefined;

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

  function applyEverywhere(productId:string,m:Media){
   known.set(productId,m);
   document.querySelectorAll<HTMLElement>(`[data-motion-surface="deals"][data-product-id="${CSS.escape(productId)}"]`).forEach(card=>apply(card,m));
  }

  function pollVideoStatus(){
   if(statusTimer!=null||!videoTracked.size)return;
   statusTimer=window.setTimeout(async()=>{
    statusTimer=undefined;
    const ids=[...videoTracked.keys()].slice(0,40);
    try{
     const r=await fetch("/api/catalog/video/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({product_ids:ids}),cache:"no-store"});
     const d=await r.json();
     if(!r.ok||!d?.configured){return}
     let pending=false;
     for(const id of ids){
      const state=d?.jobs?.[id];
      if(!state)continue;
      if(state.status==="ready"&&state.video_url){
       const p=videoTracked.get(id);if(!p)continue;
       const m:Media={product_id:id,media_type:"video_ai",video_url:state.video_url,poster_url:p.image,preset:null,status:"ready"};
       applyEverywhere(id,m);videoTracked.delete(id);
      }else if(state.status==="failed"){videoTracked.delete(id)}
      else pending=true;
     }
     if(pending||videoTracked.size)pollVideoStatus();
    }catch{if(videoTracked.size)pollVideoStatus()}
   },4200);
  }

  function requestVideos(products:ProductMeta[]){
   const fresh=products.filter(p=>p.generateVideo&&!videoRequested.has(p.id)&&!(known.get(p.id)?.video_url)).slice(0,12);
   if(!fresh.length)return;
   fresh.forEach(p=>{videoRequested.add(p.id);videoTracked.set(p.id,p)});
   fetch("/api/catalog/video/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({products:fresh}),keepalive:true})
    .then(async r=>({ok:r.ok,data:await r.json().catch(()=>({}))}))
    .then(({ok,data})=>{
     if(!ok||!data?.configured){fresh.forEach(p=>videoTracked.delete(p.id));return}
     for(const p of fresh){
      const state=data?.jobs?.[p.id];
      if(state?.status==="ready"&&state?.video_url){
       applyEverywhere(p.id,{product_id:p.id,media_type:"video_ai",video_url:state.video_url,poster_url:p.image,preset:null,status:"ready"});
       videoTracked.delete(p.id);
      }
     }
     pollVideoStatus();
    }).catch(()=>{fresh.forEach(p=>videoTracked.delete(p.id))});
  }

  function flush(){
   flushTimer=undefined;
   const batch=[...queued.values()].filter(p=>!inflight.has(p.id)).slice(0,16);if(!batch.length)return;
   batch.forEach(p=>{queued.delete(p.id);inflight.add(p.id)});
   fetch("/api/catalog/media",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({products:batch}),keepalive:true})
    .then(r=>r.json()).then(d=>{const media=d?.media||{};for(const p of batch){const m=media[p.id] as Media|undefined;if(!m)continue;applyEverywhere(p.id,m)}requestVideos(batch)})
    .catch(()=>{})
    .finally(()=>{batch.forEach(p=>inflight.delete(p.id));if(queued.size)flushTimer=scheduleIdle(flush) as number});
  }

  function queue(card:HTMLElement){
   const p=meta(card);if(!p)return;
   // Every Deals card moves immediately. Network lookup can later upgrade it to cached/real video.
   applyInstantMotion(card,p);
   const cached=known.get(p.id);if(cached){apply(card,cached);return}
   if(inflight.has(p.id)||queued.has(p.id))return;queued.set(p.id,p);
   if(flushTimer==null)flushTimer=scheduleIdle(flush) as number;
  }

  const prewarm=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)queue(entry.target as HTMLElement)}},{root:null,rootMargin:"7000px 1200px 16000px 1200px",threshold:0});
  const active=new IntersectionObserver(entries=>{for(const entry of entries){const card=entry.target as HTMLElement,video=card.querySelector<HTMLVideoElement>("video.ynot-product-motion-video");if(entry.isIntersecting){card.classList.add("ynot-motion-active");if(video)void video.play().catch(()=>{})}else{card.classList.remove("ynot-motion-active");if(video)video.pause()}}},{root:null,rootMargin:"240px",threshold:.08});

  function attach(root:ParentNode=document){
   const cards=[...root.querySelectorAll<HTMLElement>('[data-motion-surface="deals"][data-product-id]')];
   cards.forEach(card=>{if(card.dataset.motionObserved!=="1"){card.dataset.motionObserved="1";const p=meta(card);if(p)applyInstantMotion(card,p);prewarm.observe(card);active.observe(card)}});
   // Fast swipes can cover several screens in a moment. Proactively prepare the next visible feed runway,
   // instead of waiting for each card to approach the viewport.
   const runway=cards.filter(card=>{const rect=card.getBoundingClientRect();return rect.bottom>-1200&&rect.top<window.innerHeight+16000}).slice(0,96);
   runway.forEach(queue);
  }
  attach();
  const mutation=new MutationObserver(records=>{for(const r of records)for(const node of r.addedNodes)if(node instanceof HTMLElement){if(node.matches('[data-motion-surface="deals"][data-product-id]'))attach(node.parentElement||document);else attach(node)}});
  mutation.observe(document.body,{childList:true,subtree:true});
  return()=>{mutation.disconnect();prewarm.disconnect();active.disconnect();if(flushTimer!=null)window.clearTimeout(flushTimer);if(statusTimer!=null)window.clearTimeout(statusTimer)};
 },[]);
 return null;
}