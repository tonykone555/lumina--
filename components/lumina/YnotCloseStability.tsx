"use client";

import {useEffect} from "react";

export default function YnotCloseStability(){
 useEffect(()=>{
  const stopPointer=(event:Event)=>event.stopPropagation();
  const wired=new Set<HTMLElement>();
  const wireGestureCloseButtons=()=>{
   document.querySelectorAll<HTMLElement>(".ynot-selected-close,.ynot-story-close").forEach(button=>{
    if(wired.has(button))return;
    wired.add(button);
    button.addEventListener("pointerdown",stopPointer);
    button.addEventListener("pointerup",stopPointer);
   });
  };
  const clearTransientDealState=()=>{
   document.querySelector<HTMLButtonElement>(".ynot-story-close")?.click();
   document.querySelector<HTMLButtonElement>(".ynot-selected-close")?.click();
   document.querySelector<HTMLButtonElement>(".ynot-cart > header button")?.click();
  };
  const onCloseCapture=(event:MouseEvent)=>{
   const target=event.target as HTMLElement|null;
   if(!target)return;
   const closingDrawer=Boolean(target.closest(".ynot-close"));
   const closingBackdrop=target.classList.contains("ynot-backdrop")&&target.classList.contains("open");
   if(closingDrawer||closingBackdrop)clearTransientDealState();
  };
  wireGestureCloseButtons();
  const observer=new MutationObserver(wireGestureCloseButtons);
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener("click",onCloseCapture,true);
  return()=>{
   observer.disconnect();
   document.removeEventListener("click",onCloseCapture,true);
   wired.forEach(button=>{
    button.removeEventListener("pointerdown",stopPointer);
    button.removeEventListener("pointerup",stopPointer);
   });
   wired.clear();
  };
 },[]);
 return null;
}
