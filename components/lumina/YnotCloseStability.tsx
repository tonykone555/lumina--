"use client";

import {useEffect} from "react";

export default function YnotCloseStability(){
 useEffect(()=>{
  const stopPointer=(event:Event)=>event.stopPropagation();
  const wired=new Set<HTMLElement>();
  let cleanupFrame=0;

  const wireGestureControls=()=>{
   document.querySelectorAll<HTMLElement>(".ynot-selected-close,.ynot-story-close,.ynot-selected-heart,.ynot-story-heart,.ynot-final-save-heart,.ynot-close").forEach(button=>{
    if(wired.has(button))return;
    wired.add(button);
    button.style.setProperty("pointer-events","auto","important");
    button.style.setProperty("touch-action","manipulation","important");
    button.addEventListener("pointerdown",stopPointer);
    button.addEventListener("pointerup",stopPointer);
   });
  };

  const clearVisualState=()=>{
   cancelAnimationFrame(cleanupFrame);
   cleanupFrame=requestAnimationFrame(()=>{
    const drawer=document.querySelector(".ynot-drawer");
    if(drawer?.classList.contains("open"))return;
    document.documentElement.classList.remove("ynot-deal-product-open");
    document.body.classList.remove("ynot-deal-product-open");
   });
  };

  const onClick=(event:MouseEvent)=>{
   const target=event.target as HTMLElement|null;if(!target)return;
   if(target.closest(".ynot-close,.ynot-selected-close,.ynot-story-close")||(target.classList.contains("ynot-backdrop")&&target.classList.contains("open")))clearVisualState();
  };

  const onOpen=()=>{document.documentElement.classList.remove("ynot-deal-product-open");document.body.classList.remove("ynot-deal-product-open")};
  wireGestureControls();
  const observer=new MutationObserver(()=>{wireGestureControls();clearVisualState()});
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  document.addEventListener("click",onClick,false);
  window.addEventListener("ynot:open-deals",onOpen);
  return()=>{
   cancelAnimationFrame(cleanupFrame);observer.disconnect();document.removeEventListener("click",onClick,false);window.removeEventListener("ynot:open-deals",onOpen);
   wired.forEach(button=>{button.removeEventListener("pointerdown",stopPointer);button.removeEventListener("pointerup",stopPointer)});wired.clear();
  };
 },[]);
 return null;
}
