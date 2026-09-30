"use client";
import {useEffect} from "react";

export default function RoomProductImageTapFix(){
 useEffect(()=>{
  let start:{x:number;y:number;img:HTMLImageElement}|null=null;
  let suppressClickUntil=0;
  const down=(e:TouchEvent)=>{
   const img=(e.target as Element|null)?.closest<HTMLImageElement>(".yr-modal .yr-card-img");
   if(!img){start=null;return}
   const t=e.touches[0];if(!t)return;
   start={x:t.clientX,y:t.clientY,img};
  };
  const up=(e:TouchEvent)=>{
   if(!start)return;
   const s=start;start=null;
   const t=e.changedTouches[0];if(!t||!s.img.isConnected)return;
   const dx=t.clientX-s.x,dy=t.clientY-s.y;
   if(Math.hypot(dx,dy)>12)return;
   e.preventDefault();e.stopPropagation();
   suppressClickUntil=Date.now()+450;
   s.img.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,view:window}));
  };
  const click=(e:MouseEvent)=>{
   const img=(e.target as Element|null)?.closest<HTMLImageElement>(".yr-modal .yr-card-img");
   if(img&&Date.now()<suppressClickUntil&&!e.isTrusted){return}
   if(img&&Date.now()<suppressClickUntil&&e.isTrusted){e.preventDefault();e.stopImmediatePropagation()}
  };
  document.addEventListener("touchstart",down,{passive:true,capture:true});
  document.addEventListener("touchend",up,{passive:false,capture:true});
  document.addEventListener("click",click,true);
  return()=>{document.removeEventListener("touchstart",down,true);document.removeEventListener("touchend",up,true);document.removeEventListener("click",click,true)};
 },[]);
 return <style jsx global>{`.yr-modal .yr-card-img{cursor:pointer!important;pointer-events:auto!important;-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;touch-action:pan-y!important}`}</style>
}
