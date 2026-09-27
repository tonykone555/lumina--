"use client";

import {useEffect,useRef} from "react";

export default function MobileProductSwipeController(){
 const activeIndex=useRef(-1);
 useEffect(()=>{
  const products=()=>[...document.querySelectorAll<HTMLButtonElement>("button.lv4-product[data-product-id]")].filter(node=>node.isConnected);
  const remember=(node:HTMLButtonElement|null)=>{if(!node)return;const list=products(),index=list.indexOf(node);if(index>=0)activeIndex.current=index};
  const syncFromDetail=()=>{const list=products();if(!list.length)return;const detail=document.querySelector<HTMLElement>(".lv4-detail"),title=(detail?.querySelector<HTMLElement>("h2")?.textContent||"").trim();const index=list.findIndex(node=>(node.dataset.productTitle||"").trim()===title);if(index>=0)activeIndex.current=index};
  const switchProduct=(direction:number)=>{const list=products();if(list.length<2)return;syncFromDetail();let index=activeIndex.current;if(index<0||index>=list.length)index=0;index=(index+direction+list.length)%list.length;activeIndex.current=index;const node=list[index];node.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true,pointerType:"mouse"}));node.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,view:window}))};
  const blocked=(target:EventTarget|null)=>target instanceof Element&&Boolean(target.closest("a,input,textarea,select,button,.ynot-complete-image-viewer,.ynot-description-back,.ynot-shopify-description,.lv4-actions,.ynot-loaded-variants,.lv4-similar-block,.lv4-direction-row,.ynot-loaded-gallery"));
  let sx=0,sy=0,tracking=false,fired=false,suppressUntil=0;
  const start=(x:number,y:number,target:EventTarget|null)=>{if(window.innerWidth>=900||!(target instanceof Element)||!target.closest(".lv4-detail")||blocked(target))return;sx=x;sy=y;tracking=true;fired=false};
  const move=(x:number,y:number,event:Event)=>{if(!tracking||fired)return;const dx=x-sx,dy=y-sy;if(Math.abs(dx)<26||Math.abs(dx)<=Math.abs(dy)*.72)return;fired=true;suppressUntil=Date.now()+500;event.preventDefault();event.stopPropagation();switchProduct(dx<0?1:-1)};
  const touchStart=(e:TouchEvent)=>{if(e.touches.length===1)start(e.touches[0].clientX,e.touches[0].clientY,e.target)};
  const touchMove=(e:TouchEvent)=>{if(e.touches.length===1)move(e.touches[0].clientX,e.touches[0].clientY,e)};
  const touchEnd=()=>{tracking=false;fired=false};
  const pointerStart=(e:PointerEvent)=>{if(e.pointerType==="touch"&&!tracking)start(e.clientX,e.clientY,e.target)};
  const pointerMove=(e:PointerEvent)=>{if(e.pointerType==="touch")move(e.clientX,e.clientY,e)};
  const pointerEnd=()=>{tracking=false;fired=false};
  const click=(e:MouseEvent)=>{const bubble=(e.target as Element|null)?.closest<HTMLButtonElement>("button.lv4-product[data-product-id]");if(bubble){remember(bubble);return}if(Date.now()<suppressUntil&&e.target instanceof Element&&e.target.closest(".lv4-detail")){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}};
  const clean=()=>{if(window.innerWidth>=900)return;document.querySelectorAll<HTMLElement>(".lv4-detail").forEach(card=>card.querySelectorAll<HTMLButtonElement>(":scope > button.lv4-close,:scope > button[aria-label='Close product']").forEach(button=>button.remove()))};
  document.addEventListener("click",click,true);document.addEventListener("touchstart",touchStart,{capture:true,passive:true});document.addEventListener("touchmove",touchMove,{capture:true,passive:false});document.addEventListener("touchend",touchEnd,{capture:true,passive:true});document.addEventListener("touchcancel",touchEnd,{capture:true,passive:true});document.addEventListener("pointerdown",pointerStart,true);document.addEventListener("pointermove",pointerMove,{capture:true,passive:false});document.addEventListener("pointerup",pointerEnd,true);document.addEventListener("pointercancel",pointerEnd,true);const observer=new MutationObserver(clean);observer.observe(document.body,{subtree:true,childList:true});clean();
  return()=>{observer.disconnect();document.removeEventListener("click",click,true);document.removeEventListener("touchstart",touchStart,true);document.removeEventListener("touchmove",touchMove,true);document.removeEventListener("touchend",touchEnd,true);document.removeEventListener("touchcancel",touchEnd,true);document.removeEventListener("pointerdown",pointerStart,true);document.removeEventListener("pointermove",pointerMove,true);document.removeEventListener("pointerup",pointerEnd,true);document.removeEventListener("pointercancel",pointerEnd,true)}
 },[]);
 return <style>{`@media(max-width:899px){.lv4-detail>.lv4-close,.lv4-detail>button[aria-label="Close product"]{display:none!important}.lv4-mobile-floating-close{display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}.lv4-detail,.lv4-detail-media{touch-action:pan-y!important;-webkit-user-select:none!important;user-select:none!important}}`}</style>
}
