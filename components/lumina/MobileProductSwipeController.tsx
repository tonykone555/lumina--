"use client";

import {useEffect,useRef} from "react";

const norm=(v:string)=>String(v||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function mediaList(value:string){return [...new Set(value.split("|").map(x=>x.trim()).filter(Boolean))]}
function isVideo(url:string){return /\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(url)||/[?&](?:format|fm)=(?:mp4|webm)/i.test(url)}

export default function MobileProductSwipeController(){
 const activeIndex=useRef(-1);
 useEffect(()=>{
  const productNodes=()=>[...document.querySelectorAll<HTMLButtonElement>("button.lv4-product")].filter(n=>n.isConnected);
  const syncIndex=()=>{const list=productNodes(),detail=document.querySelector<HTMLElement>(".lv4-detail"),title=norm(detail?.querySelector<HTMLElement>("h2")?.textContent||"");let i=list.findIndex(n=>norm(n.dataset.productTitle||"")===title);if(i<0){const fallback=detail?.querySelector<HTMLImageElement>(".lv4-detail-media")?.dataset.productFallback||"";i=list.findIndex(n=>n.dataset.productImage===fallback)}if(i>=0)activeIndex.current=i};
  const nextProduct=(direction:number)=>{const list=productNodes();if(list.length<2)return;syncIndex();let i=activeIndex.current;if(i<0||i>=list.length)i=0;const next=(i+direction+list.length)%list.length;activeIndex.current=next;requestAnimationFrame(()=>list[next]?.click())};
  const blocked=(target:EventTarget|null)=>target instanceof Element&&Boolean(target.closest("a,input,textarea,select,button,.ynot-loaded-gallery,.ynot-complete-image-viewer,.lv4-similar-block,.lv4-actions,.lv4-direction-row,.ynot-loaded-variants"));
  const bindCard=(card:HTMLElement)=>{
   if(card.dataset.ynotSwipeBound==="1")return;card.dataset.ynotSwipeBound="1";let sx=0,sy=0,tracking=false;
   card.addEventListener("touchstart",e=>{if(window.innerWidth>=900||e.touches.length!==1||blocked(e.target))return;const t=e.touches[0];sx=t.clientX;sy=t.clientY;tracking=true},{passive:true});
   card.addEventListener("touchmove",e=>{if(!tracking||e.touches.length!==1)return;const t=e.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*.65)e.preventDefault()},{passive:false});
   card.addEventListener("touchend",e=>{if(!tracking||!e.changedTouches.length)return;tracking=false;const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)<36||Math.abs(dx)<Math.abs(dy)*.72)return;e.preventDefault();e.stopPropagation();nextProduct(dx<0?1:-1)},{passive:false});
   card.addEventListener("touchcancel",()=>{tracking=false},{passive:true});
  };
  const mainTap=(e:MouseEvent)=>{if(window.innerWidth>=900||!(e.target instanceof HTMLImageElement)||!e.target.classList.contains("lv4-detail-media"))return;const gallery=e.target.closest(".lv4-detail")?.querySelector<HTMLElement>(".ynot-loaded-gallery");if(!gallery)return;const media=mediaList(gallery.dataset.ynotFullMediaSignature||gallery.dataset.mediaSignature||"").filter(x=>!isVideo(x));if(media.length<2)return;e.preventDefault();e.stopPropagation();e.target.dataset.ynotGalleryOwned="1";const current=e.target.currentSrc||e.target.src;let i=media.findIndex(x=>x===current);if(i<0)i=Number(gallery.dataset.activeMediaIndex||0);i=(i+1)%media.length;gallery.dataset.activeMediaIndex=String(i);e.target.src=media[i];e.target.dataset.ynotImageIndex=String(i)};
  const scan=()=>{if(window.innerWidth>=900)return;document.querySelectorAll<HTMLElement>(".lv4-detail").forEach(card=>{bindCard(card);card.querySelectorAll<HTMLButtonElement>(":scope > button.lv4-close, :scope > button[aria-label='Close product']").forEach(b=>b.remove())})};
  const productClick=(e:Event)=>{const n=(e.target as Element|null)?.closest<HTMLButtonElement>("button.lv4-product");if(n){const i=productNodes().indexOf(n);if(i>=0)activeIndex.current=i}};
  document.addEventListener("click",productClick,true);document.addEventListener("click",mainTap,true);const observer=new MutationObserver(scan);observer.observe(document.body,{subtree:true,childList:true});scan();
  return()=>{observer.disconnect();document.removeEventListener("click",productClick,true);document.removeEventListener("click",mainTap,true)}
 },[]);
 return <style>{`@media(max-width:899px){.lv4-detail>.lv4-close,.lv4-detail>button[aria-label="Close product"]{display:none!important}.lv4-mobile-floating-close{display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}.lv4-detail{touch-action:pan-y!important}.lv4-detail-media{touch-action:pan-y!important;-webkit-user-select:none!important;user-select:none!important}}`}</style>
}
