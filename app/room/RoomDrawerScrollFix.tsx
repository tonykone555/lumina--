"use client";
import {useEffect} from "react";

/** Keep product-drawer gestures inside the drawer instead of scrolling the Room/photo. */
export default function RoomDrawerScrollFix(){
 useEffect(()=>{
  const sync=()=>{
   const room=document.querySelector<HTMLElement>(".yr");
   const results=document.querySelector<HTMLElement>(".yr-results");
   if(!room)return;
   if(results){
    if(!room.dataset.drawerLocked){room.dataset.drawerScroll=String(room.scrollTop);room.dataset.drawerLocked="1"}
    room.style.overflow="hidden";
    room.style.overscrollBehavior="none";
   }else{
    room.style.overflow="auto";
    room.style.overscrollBehavior="";
    delete room.dataset.drawerLocked;
    delete room.dataset.drawerScroll;
   }
  };
  const observer=new MutationObserver(sync);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  sync();
  return()=>{observer.disconnect();const room=document.querySelector<HTMLElement>(".yr");if(room){room.style.overflow="auto";room.style.overscrollBehavior=""}}
 },[]);
 return <style jsx global>{`
  .yr-results{touch-action:pan-y;overscroll-behavior:contain}
  .yr-results:not(.expanded){overflow:hidden}
  .yr-results.expanded{overflow-y:auto!important;-webkit-overflow-scrolling:touch;touch-action:pan-y}
  .yr-results .yr-results-head,.yr-results .yr-drawer-hint{touch-action:pan-y}
 `}</style>
}
