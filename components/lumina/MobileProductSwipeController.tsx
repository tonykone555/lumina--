"use client";

import {useEffect,useRef} from "react";

export default function MobileProductSwipeController():null{
 const activeIndex=useRef(-1);
 const touch=useRef<{x:number;y:number;target:EventTarget|null}|null>(null);
 useEffect(()=>{
  const onProductClick=(event:Event)=>{
   const target=event.target as HTMLElement|null;
   const product=target?.closest<HTMLElement>(".lv4-product");
   if(!product)return;
   const products=[...document.querySelectorAll<HTMLElement>(".lv4-product")];
   activeIndex.current=products.indexOf(product);
  };
  const onTouchStart=(event:TouchEvent)=>{
   if(window.innerWidth>=900||event.touches.length!==1)return;
   const card=(event.target as HTMLElement|null)?.closest<HTMLElement>(".lv4-detail");
   if(!card)return;
   const t=event.touches[0];
   touch.current={x:t.clientX,y:t.clientY,target:event.target};
  };
  const onTouchEnd=(event:TouchEvent)=>{
   if(window.innerWidth>=900||!touch.current||!event.changedTouches.length)return;
   const start=touch.current;touch.current=null;
   const target=start.target as HTMLElement|null;
   if(target?.closest("button,input,textarea,select,a,.ynot-loaded-gallery,.lv4-gallery,.ynot-full-slider,.ynot-description-back"))return;
   const t=event.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;
   if(Math.abs(dx)<72||Math.abs(dx)<Math.abs(dy)*1.25)return;
   const products=[...document.querySelectorAll<HTMLElement>(".lv4-product")];
   if(!products.length)return;
   let index=activeIndex.current;
   if(index<0){
    const detailTitle=document.querySelector<HTMLElement>(".lv4-detail h2")?.textContent?.trim().toLowerCase()||"";
    index=products.findIndex(node=>{
     const label=(node.getAttribute("aria-label")||node.getAttribute("title")||node.textContent||"").trim().toLowerCase();
     return Boolean(detailTitle&&label.includes(detailTitle));
    });
   }
   if(index<0)index=0;
   const next=(index+(dx<0?1:-1)+products.length)%products.length;
   activeIndex.current=next;
   products[next]?.click();
  };
  document.addEventListener("click",onProductClick,true);
  document.addEventListener("touchstart",onTouchStart,{passive:true,capture:true});
  document.addEventListener("touchend",onTouchEnd,{passive:true,capture:true});
  return()=>{
   document.removeEventListener("click",onProductClick,true);
   document.removeEventListener("touchstart",onTouchStart,true);
   document.removeEventListener("touchend",onTouchEnd,true);
  };
 },[]);
 return null;
}
