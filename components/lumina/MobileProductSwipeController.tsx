"use client";

import {useEffect,useRef} from "react";

const richMediaCache=new Map<string,Promise<string[]>>();
const norm=(v:string)=>String(v||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const mediaUrl=(v:any):string=>typeof v==="string"?v:String(v?.url||v?.src||v?.image?.url||v?.image||v?.previewImage?.url||v?.preview_image?.url||"");
function collectMedia(product:any){return [...new Set<string>([mediaUrl(product?.image),...(product?.images||[]).map(mediaUrl),...(product?.variants||[]).map((v:any)=>mediaUrl(v?.image)),...(product?.media||[]).map(mediaUrl)].filter(Boolean))]}
function mediaList(value:string){return [...new Set(value.split("|").map(x=>x.trim()).filter(Boolean))]}

export default function MobileProductSwipeController(){
 const activeIndex=useRef(-1);
 const gesture=useRef<{x:number;y:number;target:EventTarget|null}|null>(null);
 const lastPointerFinish=useRef(0);
 useEffect(()=>{
  const products=()=>[...document.querySelectorAll<HTMLElement>(".lv4-product[data-product-id]")].filter(node=>node.isConnected);
  const syncIndex=()=>{
   const list=products();if(!list.length)return;
   const title=norm(document.querySelector<HTMLElement>(".lv4-detail .lv4-detailcopy h2,.lv4-detail h2")?.textContent||"");
   const index=list.findIndex(node=>norm(node.dataset.productTitle||node.textContent||"")===title);
   if(index>=0)activeIndex.current=index;
  };
  const nextProduct=(direction:number)=>{
   const list=products();if(list.length<2)return;syncIndex();let index=activeIndex.current;if(index<0||index>=list.length)index=0;
   const next=(index+direction+list.length)%list.length;activeIndex.current=next;list[next].click();
  };
  const interactive=(target:EventTarget|null)=>target instanceof Element&&Boolean(target.closest("a,input,textarea,select,.lv4-close,.lv4-mobile-floating-close,.ynot-complete-image-viewer,.ynot-loaded-gallery,.ynot-full-slider,.ynot-description-back,.ynot-shopify-description,.lv4-actions,.ynot-loaded-variants"));
  const start=(x:number,y:number,target:EventTarget|null)=>{if(window.innerWidth>=900||!(target instanceof Element)||!target.closest(".lv4-detail")||interactive(target))return;gesture.current={x,y,target}};
  const finish=(x:number,y:number,target:EventTarget|null,event?:Event)=>{if(window.innerWidth>=900||!gesture.current)return false;const g=gesture.current;gesture.current=null;if(interactive(g.target)||interactive(target))return false;const dx=x-g.x,dy=y-g.y;if(Math.abs(dx)<34||Math.abs(dx)<Math.abs(dy)*.9)return false;event?.preventDefault();event?.stopPropagation();nextProduct(dx<0?1:-1);return true};
  const onPointerDown=(e:PointerEvent)=>{if(e.pointerType!=="mouse")start(e.clientX,e.clientY,e.target)};
  const onPointerUp=(e:PointerEvent)=>{if(e.pointerType!=="mouse"&&finish(e.clientX,e.clientY,e.target,e))lastPointerFinish.current=Date.now()};
  const onTouchStart=(e:TouchEvent)=>{if(Date.now()-lastPointerFinish.current<250)return;if(e.touches.length===1)start(e.touches[0].clientX,e.touches[0].clientY,e.target)};
  const onTouchEnd=(e:TouchEvent)=>{if(Date.now()-lastPointerFinish.current<250)return;if(e.changedTouches.length)finish(e.changedTouches[0].clientX,e.changedTouches[0].clientY,e.target,e)};
  const onProductClick=(e:Event)=>{const node=(e.target as Element|null)?.closest<HTMLElement>(".lv4-product[data-product-id]");if(!node)return;const index=products().indexOf(node);if(index>=0)activeIndex.current=index};

  const removeDuplicateClose=()=>{
   if(window.innerWidth>=900)return;
   document.querySelectorAll<HTMLElement>(".lv4-detail").forEach(shell=>{
    const inside=shell.querySelector<HTMLElement>(":scope > .lv4-close");
    if(inside){inside.style.setProperty("display","none","important");inside.style.setProperty("visibility","hidden","important");inside.style.setProperty("pointer-events","none","important");inside.setAttribute("aria-hidden","true")}
    shell.querySelectorAll<HTMLButtonElement>("button").forEach(button=>{
     if(button.closest(".lv4-detailcopy,.ynot-loaded-gallery,.ynot-complete-image-viewer,.ynot-description-back"))return;
     const text=(button.textContent||"").trim(),label=(button.getAttribute("aria-label")||"").toLowerCase();
     if(button.classList.contains("lv4-close")||/^[×✕✖x]$/i.test(text)||(/close/.test(label)&&/(image|gallery|media|slider|photo)/.test(label))){button.style.setProperty("display","none","important");button.style.setProperty("pointer-events","none","important");button.setAttribute("aria-hidden","true")}
    });
   });
  };

  const hydrateFullGallery=()=>{
   if(window.innerWidth>=900)return;
   document.querySelectorAll<HTMLElement>(".lv4-detail").forEach(shell=>{
    const gallery=shell.querySelector<HTMLElement>(".ynot-loaded-gallery"),title=shell.querySelector<HTMLElement>(".lv4-detailcopy h2")?.textContent?.trim()||"";
    if(!gallery||!title)return;
    const locked=mediaList(gallery.dataset.ynotFullMediaSignature||"");
    const current=mediaList(gallery.dataset.mediaSignature||"");
    if(locked.length>current.length){gallery.dataset.mediaSignature=locked.join("|");delete gallery.dataset.ynotCompleteMarker}
    if(gallery.dataset.ynotFullMediaRequested==="1")return;gallery.dataset.ynotFullMediaRequested="1";
    const key=norm(title);let job=richMediaCache.get(key);if(!job){job=(async()=>{try{
     const r=await fetch(`/api/catalog?q=${encodeURIComponent(title)}&market=lumina&source=all&page=0`,{cache:"no-store"}),d=await r.json(),list=Array.isArray(d?.products)?d.products:[];
     const product=list.find((p:any)=>norm(p?.title)===key)||list.find((p:any)=>norm(p?.title).includes(key)||key.includes(norm(p?.title)))||list[0];if(!product)return[];
     let media=collectMedia(product);
     if(String(product?.source||"").toLowerCase().includes("shopify"))try{const rr=await fetch("/api/commerce/product-link",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(product)}),rich=await rr.json();if(rr.ok&&rich?.product)media=[...new Set([...media,...collectMedia(rich.product)])]}catch{}
     return media;
    }catch{return[]}})();richMediaCache.set(key,job)}
    void job.then(media=>{if(!document.body.contains(gallery)||!media.length)return;const now=mediaList(gallery.dataset.mediaSignature||""),merged=[...new Set([...now,...media])];gallery.dataset.ynotFullMediaSignature=merged.join("|");gallery.dataset.mediaSignature=merged.join("|");delete gallery.dataset.ynotCompleteMarker});
   });
  };

  let frame=0;const scan=()=>{frame=0;removeDuplicateClose();hydrateFullGallery()};const schedule=()=>{if(!frame)frame=requestAnimationFrame(scan)};
  document.addEventListener("click",onProductClick,true);document.addEventListener("pointerdown",onPointerDown,true);document.addEventListener("pointerup",onPointerUp,true);document.addEventListener("touchstart",onTouchStart,{passive:true,capture:true});document.addEventListener("touchend",onTouchEnd,{passive:false,capture:true});
  const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","data-media-signature"]});schedule();
  return()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame);document.removeEventListener("click",onProductClick,true);document.removeEventListener("pointerdown",onPointerDown,true);document.removeEventListener("pointerup",onPointerUp,true);document.removeEventListener("touchstart",onTouchStart,true);document.removeEventListener("touchend",onTouchEnd,true)};
 },[]);
 return <style>{`@media(max-width:899px){.lv4-scene{visibility:visible!important;opacity:.72!important;background-image:linear-gradient(rgba(8,8,8,.08),rgba(8,8,8,.18)),var(--scene)!important;background-size:cover!important;background-position:center!important}.lv4-shell:has(.lv4-detail) .lv4-scene{opacity:.62!important}.lv4-detail>.lv4-close{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}.lv4-mobile-floating-close{display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}.lv4-detail{touch-action:pan-y!important}.lv4-detail>.lv4-detail-media{touch-action:pan-y!important}}`}</style>;
}
