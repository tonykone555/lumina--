"use client";

import {useEffect,useRef} from "react";

const norm=(v:string)=>String(v||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
export default function MobileProductSwipeController(){
 const touch=useRef<{x:number;y:number;target:Element|null}|null>(null),swipedAt=useRef(0);
 useEffect(()=>{
  const products=()=>[...document.querySelectorAll<HTMLButtonElement>("button.lv4-product[data-product-id]")].filter(n=>n.isConnected);
  const currentIndex=()=>{const list=products(),detail=document.querySelector<HTMLElement>(".lv4-detail");if(!list.length||!detail)return-1;const id=detail.dataset.productId||detail.getAttribute("data-product-id")||"";if(id){const i=list.findIndex(n=>n.dataset.productId===id);if(i>=0)return i}const title=norm(detail.querySelector<HTMLElement>("h2")?.textContent||"");if(title){const i=list.findIndex(n=>norm(n.dataset.productTitle||"")===title);if(i>=0)return i}const image=detail.querySelector<HTMLImageElement>(".lv4-detail-media")?.dataset.productFallback||"";if(image){const i=list.findIndex(n=>n.dataset.productImage===image);if(i>=0)return i}return-1};
  const switchProduct=(direction:number)=>{const list=products();if(list.length<2)return;let i=currentIndex();if(i<0)i=0;const next=list[(i+direction+list.length)%list.length];next.scrollIntoView({block:"nearest",inline:"nearest"});next.click()};
  const interactive=(target:Element|null)=>Boolean(target?.closest("input,textarea,select,a,.lv4-mobile-floating-close,.ynot-close,.ynot-description-toggle,.ynot-description-back,.lv4-actions,.ynot-loaded-variants,.lv4-similar-block,.ynot-loaded-gallery,.lv4-gallery,.ynot-complete-image-viewer,.ynot-mobile-full-gallery"));
  const start=(event:TouchEvent)=>{if(window.innerWidth>=900||event.touches.length!==1||!(event.target instanceof Element)||!event.target.closest(".lv4-detail")||interactive(event.target)){touch.current=null;return}const t=event.touches[0];touch.current={x:t.clientX,y:t.clientY,target:event.target}};
  const end=(event:TouchEvent)=>{const origin=touch.current;touch.current=null;if(window.innerWidth>=900||!origin||!event.changedTouches.length)return;const t=event.changedTouches[0],dx=t.clientX-origin.x,dy=t.clientY-origin.y;if(Math.abs(dx)<34||Math.abs(dx)<=Math.abs(dy)*1.05)return;event.preventDefault();event.stopPropagation();swipedAt.current=Date.now();switchProduct(dx<0?1:-1)};
  const ghost=(event:MouseEvent)=>{if(Date.now()-swipedAt.current>700)return;if(event.target instanceof Element&&event.target.closest(".lv4-detail")){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation()}};
  document.addEventListener("touchstart",start,{capture:true,passive:true});document.addEventListener("touchend",end,{capture:true,passive:false});document.addEventListener("click",ghost,true);
  return()=>{document.removeEventListener("touchstart",start,true);document.removeEventListener("touchend",end,true);document.removeEventListener("click",ghost,true)};
 },[]);
 return <style jsx global>{`
 @media(max-width:899px){
  .lv4-detail{touch-action:pan-y!important;-webkit-user-select:none!important;user-select:none!important}
  .lv4-detail-media{touch-action:pan-y!important;-webkit-user-drag:none!important;user-select:none!important}
  .lv4-detail .ynot-selected-close,.lv4-detail .ynot-story-close,.lv4-detail .ynot-selected-heart,.lv4-detail .ynot-story-heart,.lv4-detail .ynot-final-save-heart,.lv4-detail>.lv4-close{display:none!important;pointer-events:none!important}
 }
 `}</style>;
}
