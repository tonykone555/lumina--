"use client";

import {useEffect} from "react";

export default function YnotCloseStability(){
 useEffect(()=>{
  const stopPointer=(event:Event)=>event.stopPropagation();
  const wired=new Set<HTMLElement>();
  let cleanupFrame=0;

  const forceCloseDeals=()=>{
   const backdrop=document.querySelector<HTMLElement>(".ynot-backdrop.open");
   if(backdrop){backdrop.click();return}
   const drawer=document.querySelector<HTMLElement>(".ynot-drawer.open");
   drawer?.classList.remove("open");
  };

  const removeLegacyInnerControls=()=>{
   document.querySelectorAll<HTMLElement>(".lv4-detail .ynot-selected-close,.lv4-detail .ynot-story-close,.lv4-detail .ynot-selected-heart,.lv4-detail .ynot-story-heart,.lv4-detail .ynot-final-save-heart,.lv4-detail>.lv4-close,.lv4-detail>button[aria-label='Close product']").forEach(node=>node.remove());
  };

  const onNativeDealsClose=(event:Event)=>{
   const target=event.target as Element|null;
   if(!target?.closest(".ynot-close"))return;
   event.preventDefault();event.stopPropagation();forceCloseDeals();clearVisualState();
  };

  const wireGestureControls=()=>{
   removeLegacyInnerControls();
   // Only wire controls that live outside the product detail. Wiring the old inner
   // close/heart layer stopped pointer propagation before the swipe controller saw it.
   document.querySelectorAll<HTMLElement>(".ynot-close,.lv4-mobile-floating-close").forEach(button=>{
    if(wired.has(button))return;wired.add(button);
    button.style.setProperty("pointer-events","auto","important");
    button.style.setProperty("touch-action","manipulation","important");
    button.addEventListener("pointerdown",stopPointer);button.addEventListener("pointerup",stopPointer);
   });
  };

  const clearVisualState=()=>{
   cancelAnimationFrame(cleanupFrame);cleanupFrame=requestAnimationFrame(()=>{
    const drawer=document.querySelector(".ynot-drawer");if(drawer?.classList.contains("open"))return;
    document.documentElement.classList.remove("ynot-deal-open","ynot-deal-product-open");document.body.classList.remove("ynot-deal-open","ynot-deal-product-open");
   });
  };

  const onClick=(event:MouseEvent)=>{
   const target=event.target as HTMLElement|null;if(!target)return;
   if(target.closest(".ynot-close,.lv4-mobile-floating-close")||(target.classList.contains("ynot-backdrop")&&target.classList.contains("open")))clearVisualState();
  };

  const onOpen=()=>{document.documentElement.classList.remove("ynot-deal-product-open");document.body.classList.remove("ynot-deal-product-open")};
  wireGestureControls();
  const observer=new MutationObserver(()=>{wireGestureControls();clearVisualState()});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  document.addEventListener("pointerdown",onNativeDealsClose,true);document.addEventListener("click",onClick,false);window.addEventListener("ynot:open-deals",onOpen);
  return()=>{cancelAnimationFrame(cleanupFrame);observer.disconnect();document.removeEventListener("pointerdown",onNativeDealsClose,true);document.removeEventListener("click",onClick,false);window.removeEventListener("ynot:open-deals",onOpen);wired.forEach(button=>{button.removeEventListener("pointerdown",stopPointer);button.removeEventListener("pointerup",stopPointer)});wired.clear()};
 },[]);
 return <style jsx global>{`
  .lv4-detail .ynot-selected-close,.lv4-detail .ynot-story-close,.lv4-detail .ynot-selected-heart,.lv4-detail .ynot-story-heart,.lv4-detail .ynot-final-save-heart,.lv4-detail>.lv4-close,.lv4-detail>button[aria-label="Close product"]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
 `}</style>;
}
