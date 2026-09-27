"use client";

import {useEffect,useRef} from "react";

const norm=(v:string)=>String(v||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function mediaList(value:string){return [...new Set(value.split("|").map(x=>x.trim()).filter(Boolean))]}
function isVideo(url:string){return /\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(url)||/[?&](?:format|fm)=(?:mp4|webm)/i.test(url)}

export default function MobileProductSwipeController(){
 const activeIndex=useRef(-1),gesture=useRef<{x:number;y:number;target:EventTarget|null;fired:boolean}|null>(null);
 useEffect(()=>{
  const productNodes=()=>[...document.querySelectorAll<HTMLElement>(".lv4-product")].filter(n=>n.isConnected);
  const syncIndex=()=>{const list=productNodes(),detail=document.querySelector<HTMLElement>(".lv4-detail"),title=norm(detail?.querySelector<HTMLElement>("h2")?.textContent||"");let i=list.findIndex(n=>norm(n.dataset.productTitle||"")===title);if(i<0){const image=detail?.querySelector<HTMLImageElement>(".lv4-detail-media")?.getAttribute("data-product-fallback")||"";i=list.findIndex(n=>n.dataset.productImage===image)}if(i>=0)activeIndex.current=i};
  const nextProduct=(direction:number)=>{const list=productNodes();if(list.length<2)return false;syncIndex();let i=activeIndex.current;if(i<0||i>=list.length)i=0;const next=(i+direction+list.length)%list.length,node=list[next];activeIndex.current=next;node.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerType:"mouse"}));node.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,view:window}));return true};
  const blocked=(target:EventTarget|null)=>target instanceof Element&&Boolean(target.closest("a,input,textarea,select,.lv4-mobile-floating-close,.ynot-complete-image-viewer,.ynot-description-back,.ynot-shopify-description,.lv4-actions,.ynot-loaded-variants,.lv4-similar-block,.lv4-direction-row,.ynot-loaded-gallery"));
  const start=(x:number,y:number,target:EventTarget|null)=>{if(window.innerWidth>=900||!(target instanceof Element)||!target.closest(".lv4-detail")||blocked(target))return;gesture.current={x,y,target,fired:false}};
  const move=(x:number,y:number,event:Event)=>{const g=gesture.current;if(!g||g.fired)return;const dx=x-g.x,dy=y-g.y;if(Math.abs(dx)<34||Math.abs(dx)<Math.abs(dy)*.72)return;g.fired=true;event.preventDefault();event.stopPropagation();nextProduct(dx<0?1:-1)};
  const touchStart=(e:TouchEvent)=>{if(e.touches.length===1)start(e.touches[0].clientX,e.touches[0].clientY,e.target)};
  const touchMove=(e:TouchEvent)=>{if(e.touches.length===1)move(e.touches[0].clientX,e.touches[0].clientY,e)};
  const touchEnd=()=>{gesture.current=null};
  const pointerDown=(e:PointerEvent)=>{if(e.pointerType==="touch"&&!gesture.current)start(e.clientX,e.clientY,e.target)};
  const pointerMove=(e:PointerEvent)=>{if(e.pointerType==="touch")move(e.clientX,e.clientY,e)};
  const pointerEnd=()=>{gesture.current=null};
  const productClick=(e:Event)=>{const n=(e.target as Element|null)?.closest<HTMLElement>(".lv4-product");if(n){const i=productNodes().indexOf(n);if(i>=0)activeIndex.current=i}};
  const mainTap=(e:MouseEvent)=>{if(window.innerWidth>=900||!(e.target instanceof HTMLImageElement)||!e.target.closest(".lv4-detail")||!e.target.classList.contains("lv4-detail-media"))return;const gallery=e.target.closest(".lv4-detail")?.querySelector<HTMLElement>(".ynot-loaded-gallery");if(!gallery)return;const media=mediaList(gallery.dataset.ynotFullMediaSignature||gallery.dataset.mediaSignature||"").filter(x=>!isVideo(x));if(media.length<2)return;e.preventDefault();e.stopPropagation();e.target.dataset.ynotGalleryOwned="1";const current=e.target.currentSrc||e.target.src;let i=media.findIndex(x=>x===current);if(i<0)i=Number(gallery.dataset.activeMediaIndex||0);i=(i+1)%media.length;gallery.dataset.activeMediaIndex=String(i);gallery.dataset.ynotTapIndex=String(i);e.target.src=media[i];e.target.dataset.ynotImageIndex=String(i)};
  const cleanup=()=>{if(window.innerWidth>=900)return;document.querySelectorAll<HTMLElement>(".lv4-detail").forEach(shell=>{shell.querySelectorAll<HTMLButtonElement>("button").forEach(button=>{if(button.closest(".ynot-description-back,.ynot-loaded-gallery"))return;const label=(button.getAttribute("aria-label")||"").toLowerCase(),text=(button.textContent||"").trim(),r=button.getBoundingClientRect(),sr=shell.getBoundingClientRect();const close=/close/.test(label)||/^[×✕✖x]$/i.test(text)||button.classList.contains("lv4-close");if(close&&r.left>=sr.left-4&&r.right<=sr.right+4&&r.top>=sr.top-4&&r.bottom<=sr.bottom+4)button.remove()})})};
  let frame=0;const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;cleanup()})};
  document.addEventListener("click",productClick,true);document.addEventListener("click",mainTap,true);document.addEventListener("touchstart",touchStart,{capture:true,passive:true});document.addEventListener("touchmove",touchMove,{capture:true,passive:false});document.addEventListener("touchend",touchEnd,{capture:true,passive:true});document.addEventListener("touchcancel",touchEnd,{capture:true,passive:true});document.addEventListener("pointerdown",pointerDown,true);document.addEventListener("pointermove",pointerMove,true);document.addEventListener("pointerup",pointerEnd,true);document.addEventListener("pointercancel",pointerEnd,true);
  const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true});schedule();
  return()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame);document.removeEventListener("click",productClick,true);document.removeEventListener("click",mainTap,true);document.removeEventListener("touchstart",touchStart,true);document.removeEventListener("touchmove",touchMove,true);document.removeEventListener("touchend",touchEnd,true);document.removeEventListener("touchcancel",touchEnd,true);document.removeEventListener("pointerdown",pointerDown,true);document.removeEventListener("pointermove",pointerMove,true);document.removeEventListener("pointerup",pointerEnd,true);document.removeEventListener("pointercancel",pointerEnd,true)}
 },[]);
 return <style>{`@media(max-width:899px){.lv4-detail>.lv4-close,.lv4-detail button[aria-label="Close product"]{display:none!important;visibility:hidden!important;pointer-events:none!important}.lv4-mobile-floating-close{display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}.lv4-detail,.lv4-detail-media,.lv4-detail>.ynot-shared-media{touch-action:pan-y!important;-webkit-user-select:none!important;user-select:none!important}}`}</style>
}
