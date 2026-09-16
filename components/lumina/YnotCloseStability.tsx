"use client";

import {useEffect} from "react";

export default function YnotCloseStability(){
 useEffect(()=>{
  const stopPointer=(event:Event)=>event.stopPropagation();
  const wired=new Set<HTMLElement>();
  let cleanupFrame=0;

  const wireGestureCloseButtons=()=>{
   document.querySelectorAll<HTMLElement>(".ynot-selected-close,.ynot-story-close").forEach(button=>{
    if(wired.has(button))return;
    wired.add(button);
    button.addEventListener("pointerdown",stopPointer);
    button.addEventListener("pointerup",stopPointer);
   });
  };

  const clearTransientAfterDrawerCloses=()=>{
   cancelAnimationFrame(cleanupFrame);
   cleanupFrame=requestAnimationFrame(()=>{
    const drawer=document.querySelector(".ynot-drawer");
    if(drawer?.classList.contains("open"))return;
    document.querySelector<HTMLButtonElement>(".ynot-story-close")?.click();
    document.querySelector<HTMLButtonElement>(".ynot-selected-close")?.click();
    document.querySelector<HTMLButtonElement>(".ynot-cart > header button")?.click();
    document.documentElement.classList.remove("ynot-deal-product-open");
   });
  };

  const onClick=(event:MouseEvent)=>{
   const target=event.target as HTMLElement|null;
   if(!target)return;
   if(target.closest(".ynot-close")||(target.classList.contains("ynot-backdrop")&&target.classList.contains("open"))){
    clearTransientAfterDrawerCloses();
   }
  };

  wireGestureCloseButtons();
  const observer=new MutationObserver(wireGestureCloseButtons);
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener("click",onClick,false);
  return()=>{
   cancelAnimationFrame(cleanupFrame);
   observer.disconnect();
   document.removeEventListener("click",onClick,false);
   wired.forEach(button=>{
    button.removeEventListener("pointerdown",stopPointer);
    button.removeEventListener("pointerup",stopPointer);
   });
   wired.clear();
  };
 },[]);
 return null;
}
