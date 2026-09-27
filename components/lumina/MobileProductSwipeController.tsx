"use client";

import {useEffect,useRef} from "react";

const norm=(v:string)=>String(v||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
export default function MobileProductSwipeController(){
 const activeIndex=useRef(-1),touch=useRef<{x:number;y:number}|null>(null),swipedAt=useRef(0);
 useEffect(()=>{
  const products=()=>[...document.querySelectorAll<HTMLButtonElement>("button.lv4-product[data-product-id]")].filter(n=>n.isConnected);
  const remember=(node:HTMLButtonElement|null)=>{if(!node)return;const i=products().indexOf(node);if(i>=0)activeIndex.current=i};
  const syncFromDetail=()=>{const list=products(),detail=document.querySelector<HTMLElement>(".lv4-detail"),title=norm(detail?.querySelector<HTMLElement>("h2")?.textContent||"");if(!list.length)return;let i=list.findIndex(n=>norm(n.dataset.productTitle||"")===title);if(i<0){const fallback=detail?.querySelector<HTMLImageElement>(".lv4-detail-media")?.dataset.productFallback||"";i=list.findIndex(n=>n.dataset.productImage===fallback)}if(i>=0)activeIndex.current=i};
  const switchProduct=(direction:number)=>{const list=products();if(list.length<2)return;syncFromDetail();let i=activeIndex.current;if(i<0||i>=list.length)i=0;const next=(i+direction+list.length)%list.length;activeIndex.current=next;list[next]?.click()};
  const blocked=(target:EventTarget|null)=>target instanceof Element&&Boolean(target.closest("input,textarea,select,a,.ynot-description-toggle,.ynot-description-back,.ynot-shopify-description,.lv4-actions,.ynot-loaded-variants,.lv4-similar-block,.lv4-direction-row"));
  const onTouchStart=(event:TouchEvent)=>{if(window.innerWidth>=900||event.touches.length!==1||!(event.target instanceof Element)||!event.target.closest(".lv4-detail")||blocked(event.target)){touch.current=null;return}const t=event.touches[0];touch.current={x:t.clientX,y:t.clientY}};
  const onTouchEnd=(event:TouchEvent)=>{const start=touch.current;touch.current=null;if(window.innerWidth>=900||!start||!event.changedTouches.length)return;const t=event.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;if(Math.abs(dx)<42||Math.abs(dx)<Math.abs(dy)*1.02)return;event.preventDefault();event.stopPropagation();swipedAt.current=Date.now();switchProduct(dx<0?1:-1)};
  const onProductClick=(event:Event)=>remember((event.target as Element|null)?.closest<HTMLButtonElement>("button.lv4-product[data-product-id]")||null);
  const suppressGhostClick=(event:MouseEvent)=>{if(Date.now()-swipedAt.current>650)return;if(event.target instanceof Element&&event.target.closest(".lv4-detail")){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation()}};
  const cleanMobilePreview=()=>{if(window.innerWidth>=900)return;document.querySelectorAll('.ynot-mobile-full-gallery,.ynot-complete-image-viewer,.ynot-loaded-gallery,.lv4-gallery').forEach(node=>node.remove());document.querySelectorAll<HTMLImageElement>('.lv4-detail img.lv4-detail-media').forEach(img=>{img.onclick=null;img.style.pointerEvents='none'})};
  document.addEventListener("click",onProductClick,true);document.addEventListener("click",suppressGhostClick,true);document.addEventListener("touchstart",onTouchStart,{capture:true,passive:true});document.addEventListener("touchend",onTouchEnd,{capture:true,passive:false});const observer=new MutationObserver(cleanMobilePreview);observer.observe(document.body,{subtree:true,childList:true});window.addEventListener('resize',cleanMobilePreview,{passive:true});cleanMobilePreview();return()=>{observer.disconnect();document.removeEventListener("click",onProductClick,true);document.removeEventListener("click",suppressGhostClick,true);document.removeEventListener("touchstart",onTouchStart,true);document.removeEventListener("touchend",onTouchEnd,true);window.removeEventListener('resize',cleanMobilePreview)}
 },[]);
 return <style>{`@media(max-width:899px){.lv4-detail{touch-action:pan-y!important;-webkit-user-select:none!important;user-select:none!important}.lv4-detail-media{touch-action:pan-y!important;-webkit-user-select:none!important;user-select:none!important;pointer-events:none!important}.ynot-loaded-gallery,.lv4-gallery,.ynot-mobile-full-gallery,.ynot-complete-image-viewer{display:none!important;visibility:hidden!important;pointer-events:none!important}}`}</style>
}
