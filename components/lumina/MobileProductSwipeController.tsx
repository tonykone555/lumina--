"use client";

import {useEffect,useRef} from "react";

const norm=(v:string)=>String(v||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function mediaList(value:string){return [...new Set(value.split("|").map(x=>x.trim()).filter(Boolean))]}
function isVideo(url:string){return /\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(url)||/[?&](?:format|fm)=(?:mp4|webm)/i.test(url)}

export default function MobileProductSwipeController(){
 const activeIndex=useRef(-1),gesture=useRef<{x:number;y:number;target:EventTarget|null}|null>(null);
 useEffect(()=>{
  const productNodes=()=>[...document.querySelectorAll<HTMLElement>(".lv4-product")].filter(n=>n.isConnected&&n.getBoundingClientRect().width>4&&n.getBoundingClientRect().height>4);
  const syncIndex=()=>{const list=productNodes(),title=norm(document.querySelector<HTMLElement>(".lv4-detail h2")?.textContent||"");const i=list.findIndex(n=>norm(n.dataset.productTitle||n.getAttribute("aria-label")||n.textContent||"")===title);if(i>=0)activeIndex.current=i};
  const nextProduct=(direction:number)=>{const list=productNodes();if(list.length<2)return;syncIndex();let i=activeIndex.current;if(i<0||i>=list.length)i=0;i=(i+direction+list.length)%list.length;activeIndex.current=i;list[i].click()};
  const blocked=(target:EventTarget|null)=>target instanceof Element&&Boolean(target.closest("a,input,textarea,select,.lv4-mobile-floating-close,.ynot-complete-image-viewer,.ynot-description-back,.ynot-shopify-description,.lv4-actions,.ynot-loaded-variants,.lv4-similar-block,.lv4-direction-row,.ynot-loaded-gallery"));
  const start=(x:number,y:number,target:EventTarget|null)=>{if(window.innerWidth>=900||!(target instanceof Element)||!target.closest(".lv4-detail")||blocked(target))return;gesture.current={x,y,target}};
  const finish=(x:number,y:number,target:EventTarget|null,event:Event)=>{const g=gesture.current;gesture.current=null;if(window.innerWidth>=900||!g||blocked(g.target)||blocked(target))return;const dx=x-g.x,dy=y-g.y;if(Math.abs(dx)<24||Math.abs(dx)<Math.abs(dy)*.65)return;event.preventDefault();event.stopPropagation();nextProduct(dx<0?1:-1)};
  const touchStart=(e:TouchEvent)=>{if(e.touches.length===1)start(e.touches[0].clientX,e.touches[0].clientY,e.target)};
  const touchMove=(e:TouchEvent)=>{if(!gesture.current||e.touches.length!==1)return;const t=e.touches[0],dx=t.clientX-gesture.current.x,dy=t.clientY-gesture.current.y;if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*.65)e.preventDefault()};
  const touchEnd=(e:TouchEvent)=>{if(e.changedTouches.length)finish(e.changedTouches[0].clientX,e.changedTouches[0].clientY,e.target,e)};
  const pointerDown=(e:PointerEvent)=>{if(e.pointerType==="touch")start(e.clientX,e.clientY,e.target)};
  const pointerUp=(e:PointerEvent)=>{if(e.pointerType==="touch"&&gesture.current)finish(e.clientX,e.clientY,e.target,e)};
  const productClick=(e:Event)=>{const n=(e.target as Element|null)?.closest<HTMLElement>(".lv4-product");if(n){const i=productNodes().indexOf(n);if(i>=0)activeIndex.current=i}};
  const mainTap=(e:MouseEvent)=>{if(window.innerWidth>=900||!(e.target instanceof HTMLImageElement)||!e.target.closest(".lv4-detail")||!e.target.classList.contains("lv4-detail-media"))return;const gallery=e.target.closest(".lv4-detail")?.querySelector<HTMLElement>(".ynot-loaded-gallery");if(!gallery)return;const media=mediaList(gallery.dataset.ynotFullMediaSignature||gallery.dataset.mediaSignature||"").filter(x=>!isVideo(x));if(media.length<2)return;e.preventDefault();e.stopPropagation();e.target.dataset.ynotGalleryOwned="1";const current=e.target.currentSrc||e.target.src;let i=media.findIndex(x=>x===current);if(i<0)i=Number(gallery.dataset.activeMediaIndex||0);i=(i+1)%media.length;gallery.dataset.activeMediaIndex=String(i);gallery.dataset.ynotTapIndex=String(i);e.target.src=media[i];e.target.dataset.ynotImageIndex=String(i)};
  const cleanup=()=>{if(window.innerWidth>=900)return;document.querySelectorAll<HTMLElement>(".lv4-detail").forEach(shell=>{shell.querySelectorAll<HTMLButtonElement>("button").forEach(button=>{if(button.closest(".ynot-description-back,.ynot-loaded-gallery"))return;const label=(button.getAttribute("aria-label")||"").toLowerCase(),text=(button.textContent||"").trim(),r=button.getBoundingClientRect(),sr=shell.getBoundingClientRect();const looksClose=/close/.test(label)||/^[×✕✖x]$/i.test(text)||button.classList.contains("lv4-close");const insideCard=r.left>=sr.left-4&&r.right<=sr.right+4&&r.top>=sr.top-4&&r.bottom<=sr.bottom+4;if(looksClose&&insideCard)button.remove()})})};
  let frame=0;const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;cleanup()})};
  document.addEventListener("click",productClick,true);document.addEventListener("click",mainTap,true);document.addEventListener("touchstart",touchStart,{capture:true,passive:true});document.addEventListener("touchmove",touchMove,{capture:true,passive:false});document.addEventListener("touchend",touchEnd,{capture:true,passive:false});document.addEventListener("pointerdown",pointerDown,true);document.addEventListener("pointerup",pointerUp,true);
  const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true});schedule();
  return()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame);document.removeEventListener("click",productClick,true);document.removeEventListener("click",mainTap,true);document.removeEventListener("touchstart",touchStart,true);document.removeEventListener("touchmove",touchMove,true);document.removeEventListener("touchend",touchEnd,true);document.removeEventListener("pointerdown",pointerDown,true);document.removeEventListener("pointerup",pointerUp,true)}
 },[]);
 return <style>{`@media(max-width:899px){.lv4-detail>.lv4-close,.lv4-detail button[aria-label="Close product"]{display:none!important;visibility:hidden!important;pointer-events:none!important}.lv4-mobile-floating-close{display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}.lv4-detail,.lv4-detail-media,.lv4-detail>.ynot-shared-media{touch-action:pan-y!important;-webkit-user-select:none!important;user-select:none!important}}`}</style>
}
