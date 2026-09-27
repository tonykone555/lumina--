"use client";

import {useEffect,useRef} from "react";

function mediaList(value:string){return [...new Set(value.split("|").map(x=>x.trim()).filter(Boolean))]}
function isVideo(url:string){return /\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(url)||/[?&](?:format|fm)=(?:mp4|webm)/i.test(url)}

export default function MobileProductSwipeController(){
 const activeId=useRef("");
 useEffect(()=>{
  const productNodes=()=>[...document.querySelectorAll<HTMLButtonElement>("button.lv4-product[data-product-id]")].filter(n=>n.isConnected);
  const remember=(node:HTMLButtonElement|null)=>{if(node?.dataset.productId)activeId.current=node.dataset.productId};
  const currentIndex=(list:HTMLButtonElement[])=>{let i=list.findIndex(n=>n.dataset.productId===activeId.current);if(i>=0)return i;const detail=document.querySelector<HTMLElement>(".lv4-detail");const title=(detail?.querySelector("h2")?.textContent||"").trim();i=list.findIndex(n=>(n.dataset.productTitle||"").trim()===title);return i>=0?i:0};
  const nextProduct=(direction:number)=>{const list=productNodes();if(list.length<2)return;const i=currentIndex(list),next=(i+direction+list.length)%list.length,node=list[next];remember(node);node.click()};
  const interactive=(target:EventTarget|null)=>target instanceof Element&&Boolean(target.closest("a,input,textarea,select,button:not(.lv4-detail-media),.ynot-complete-image-viewer,.ynot-description-back,.ynot-shopify-description,.lv4-actions,.ynot-loaded-variants,.lv4-similar-block,.lv4-direction-row,.lv4-gallery,.ynot-loaded-gallery"));
  let sx=0,sy=0,tracking=false,moved=false;
  const start=(e:TouchEvent)=>{if(window.innerWidth>=900||e.touches.length!==1||!(e.target instanceof Element)||!e.target.closest(".lv4-detail")||interactive(e.target))return;const t=e.touches[0];sx=t.clientX;sy=t.clientY;tracking=true;moved=false};
  const move=(e:TouchEvent)=>{if(!tracking||e.touches.length!==1)return;const t=e.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*.75){moved=true;e.preventDefault()}};
  const end=(e:TouchEvent)=>{if(!tracking||!e.changedTouches.length){tracking=false;return}const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;tracking=false;if(Math.abs(dx)>=32&&Math.abs(dx)>Math.abs(dy)*.75){moved=true;e.preventDefault();e.stopPropagation();nextProduct(dx<0?1:-1)}};
  const cancel=()=>{tracking=false;moved=false};
  const productClick=(e:Event)=>remember((e.target as Element|null)?.closest<HTMLButtonElement>("button.lv4-product[data-product-id]")||null);
  const mainTap=(e:MouseEvent)=>{if(window.innerWidth>=900||moved||!(e.target instanceof HTMLImageElement)||!e.target.classList.contains("lv4-detail-media"))return;const gallery=e.target.closest(".lv4-detail")?.querySelector<HTMLElement>(".ynot-loaded-gallery");if(!gallery)return;const media=mediaList(gallery.dataset.ynotFullMediaSignature||gallery.dataset.mediaSignature||"").filter(x=>!isVideo(x));if(media.length<2)return;e.preventDefault();e.stopPropagation();const current=e.target.currentSrc||e.target.src;let i=Number(e.target.dataset.ynotImageIndex||gallery.dataset.activeMediaIndex||0);const exact=media.findIndex(x=>x===current);if(exact>=0)i=exact;i=(i+1)%media.length;gallery.dataset.activeMediaIndex=String(i);gallery.dataset.ynotTapIndex=String(i);e.target.dataset.ynotGalleryOwned="1";e.target.dataset.ynotImageIndex=String(i);e.target.src=media[i]};
  const scan=()=>{if(window.innerWidth>=900)return;document.querySelectorAll<HTMLElement>(".lv4-detail").forEach(card=>card.querySelectorAll<HTMLButtonElement>(":scope > button.lv4-close, :scope > button[aria-label='Close product']").forEach(b=>b.remove()))};
  document.addEventListener("click",productClick,true);document.addEventListener("click",mainTap,true);document.addEventListener("touchstart",start,{capture:true,passive:true});document.addEventListener("touchmove",move,{capture:true,passive:false});document.addEventListener("touchend",end,{capture:true,passive:false});document.addEventListener("touchcancel",cancel,{capture:true,passive:true});const observer=new MutationObserver(scan);observer.observe(document.body,{subtree:true,childList:true});scan();
  return()=>{observer.disconnect();document.removeEventListener("click",productClick,true);document.removeEventListener("click",mainTap,true);document.removeEventListener("touchstart",start,true);document.removeEventListener("touchmove",move,true);document.removeEventListener("touchend",end,true);document.removeEventListener("touchcancel",cancel,true)}
 },[]);
 return <style>{`@media(max-width:899px){.lv4-detail>.lv4-close,.lv4-detail>button[aria-label="Close product"]{display:none!important}.lv4-mobile-floating-close{display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}.lv4-detail,.lv4-detail-media{touch-action:pan-y!important;-webkit-user-select:none!important;user-select:none!important}}`}</style>
}
