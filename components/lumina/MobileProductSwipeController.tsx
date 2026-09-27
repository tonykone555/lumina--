"use client";

import {useEffect,useRef} from "react";

export default function MobileProductSwipeController():null{
 const activeIndex=useRef(-1);
 const touch=useRef<{x:number;y:number;target:EventTarget|null}|null>(null);
 useEffect(()=>{
  const visibleProducts=()=>[...document.querySelectorAll<HTMLElement>(".lv4-product")].filter(node=>{const r=node.getBoundingClientRect();return r.width>8&&r.height>8});
  const syncIndex=()=>{
   const products=visibleProducts();if(!products.length)return;
   const title=document.querySelector<HTMLElement>(".lv4-detail .lv4-detailcopy h2,.lv4-detail h2")?.textContent?.trim().toLowerCase()||"";
   const index=products.findIndex(node=>{const label=(node.getAttribute("aria-label")||node.getAttribute("title")||node.textContent||"").trim().toLowerCase();return Boolean(title&&label.includes(title))});
   if(index>=0)activeIndex.current=index;
  };
  const onProductClick=(event:Event)=>{const product=(event.target as HTMLElement|null)?.closest<HTMLElement>(".lv4-product");if(!product)return;const products=visibleProducts();const index=products.indexOf(product);if(index>=0)activeIndex.current=index};
  const onTouchStart=(event:TouchEvent)=>{if(window.innerWidth>=900||event.touches.length!==1)return;const card=(event.target as HTMLElement|null)?.closest<HTMLElement>(".lv4-detail");if(!card)return;const t=event.touches[0];touch.current={x:t.clientX,y:t.clientY,target:event.target}};
  const onTouchEnd=(event:TouchEvent)=>{
   if(window.innerWidth>=900||!touch.current||!event.changedTouches.length)return;const start=touch.current;touch.current=null;const target=start.target as HTMLElement|null;
   if(target?.closest("button,input,textarea,select,a,.ynot-complete-image-viewer,.ynot-loaded-gallery,.lv4-gallery,.ynot-full-slider,.ynot-description-back"))return;
   const t=event.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;if(Math.abs(dx)<58||Math.abs(dx)<Math.abs(dy)*1.15)return;
   const products=visibleProducts();if(products.length<2)return;syncIndex();let index=activeIndex.current;if(index<0||index>=products.length)index=0;
   const next=(index+(dx<0?1:-1)+products.length)%products.length;activeIndex.current=next;event.preventDefault();products[next]?.click();
  };
  document.addEventListener("click",onProductClick,true);document.addEventListener("touchstart",onTouchStart,{passive:true,capture:true});document.addEventListener("touchend",onTouchEnd,{passive:false,capture:true});
  return()=>{document.removeEventListener("click",onProductClick,true);document.removeEventListener("touchstart",onTouchStart,true);document.removeEventListener("touchend",onTouchEnd,true)};
 },[]);return null;
}
