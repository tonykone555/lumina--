"use client";

import {useEffect} from "react";

export default function RoomDesktopInteractionFix(){
 useEffect(()=>{
  let frame=0;
  const layout=()=>{
   if(window.innerWidth<=700)return;
   document.querySelectorAll<HTMLElement>(".yr-photo").forEach(stage=>{
    const img=stage.querySelector<HTMLImageElement>(":scope > img");
    if(!img||!img.naturalWidth||!img.naturalHeight)return;
    const sw=stage.clientWidth,sh=stage.clientHeight;
    if(!sw||!sh)return;
    const scale=Math.min(sw/img.naturalWidth,sh/img.naturalHeight);
    const rw=img.naturalWidth*scale,rh=img.naturalHeight*scale;
    const ox=(sw-rw)/2,oy=(sh-rh)/2;
    stage.style.setProperty("--yr-image-left",`${ox}px`);
    stage.style.setProperty("--yr-image-top",`${oy}px`);
    stage.style.setProperty("--yr-image-width",`${rw}px`);
    stage.style.setProperty("--yr-image-height",`${rh}px`);
    stage.querySelectorAll<HTMLButtonElement>(":scope > button").forEach(marker=>{
     if(!marker.dataset.yrNormX){
      const x=parseFloat(marker.style.left),y=parseFloat(marker.style.top);
      if(!Number.isFinite(x)||!Number.isFinite(y))return;
      marker.dataset.yrNormX=String(x/100);marker.dataset.yrNormY=String(y/100);
     }
     const nx=Number(marker.dataset.yrNormX),ny=Number(marker.dataset.yrNormY);
     marker.style.left=`${ox+nx*rw}px`;marker.style.top=`${oy+ny*rh}px`;
    });
   });
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(layout)};
  const imageLoad=(e:Event)=>{if(e.target instanceof HTMLImageElement&&e.target.matches(".yr-photo > img"))schedule()};
  let start:{x:number;y:number;drawer:HTMLElement}|null=null;
  const down=(e:PointerEvent)=>{if(window.innerWidth<=700||e.button!==0)return;const drawer=(e.target as Element|null)?.closest<HTMLElement>(".yr-results");if(!drawer||((e.target as Element|null)?.closest("button,a")))return;start={x:e.clientX,y:e.clientY,drawer}};
  const up=(e:PointerEvent)=>{if(!start)return;const {x,y,drawer}=start;start=null;const dx=e.clientX-x,dy=e.clientY-y;if(Math.abs(dy)<45||Math.abs(dy)<Math.abs(dx)*1.15)return;const expanded=drawer.classList.contains("expanded");if((dy<0&&!expanded)||(dy>0&&expanded))drawer.querySelector<HTMLButtonElement>(".yr-results-head .yr-round")?.click()};
  const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["src"]});
  window.addEventListener("resize",schedule);document.addEventListener("load",imageLoad,true);document.addEventListener("pointerdown",down,true);document.addEventListener("pointerup",up,true);schedule();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener("resize",schedule);document.removeEventListener("load",imageLoad,true);document.removeEventListener("pointerdown",down,true);document.removeEventListener("pointerup",up,true)};
 },[]);
 return <style jsx global>{`
  @media (min-width:701px){
   .yr-camera{min-height:0!important;height:calc(100vh - 96px)!important;max-height:900px!important;overflow:hidden!important}
   .yr-photo{height:100%!important;width:100%!important;position:relative!important;overflow:hidden!important}
   .yr-photo>img{position:absolute!important;left:var(--yr-image-left,0)!important;top:var(--yr-image-top,0)!important;width:var(--yr-image-width,100%)!important;height:var(--yr-image-height,100%)!important;max-width:none!important;max-height:none!important;object-fit:fill!important}
   .yr-results{position:fixed!important;left:50%!important;bottom:18px!important;z-index:78!important;width:min(980px,calc(100vw - 48px))!important;transform:translate(-50%,0)!important;margin:0!important;background:rgba(20,22,22,.34)!important;transition:max-height .28s ease,border-radius .28s ease,transform .28s ease!important;touch-action:pan-x!important;cursor:ns-resize!important}
   .yr-results:not(.expanded){max-height:190px!important;overflow:hidden!important}
   .yr-results.expanded{height:min(65vh,650px)!important;max-height:min(65vh,650px)!important;overflow:auto!important;border-radius:28px 28px 18px 18px!important}
   .yr-results.expanded .yr-row{grid-template-columns:repeat(auto-fill,minmax(92px,1fr))!important;align-content:start!important;padding-bottom:28px!important}
   .yr-drawer-hint{user-select:none!important}
  }
 `}</style>;
}
