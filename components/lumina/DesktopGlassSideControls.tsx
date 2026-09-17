"use client";

import {useEffect} from "react";

function norm(value:string){return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}

function currentTitle(){return norm(document.querySelector(".lv4-detail .lv4-detailcopy h2")?.textContent||"")}
function cardTitle(card:HTMLElement){return norm(card.querySelector(".lv4-product-tooltip b,.lv4-orbmeta b")?.textContent||card.getAttribute("aria-label")||"")}

function cycleProduct(direction:number){
 const cards=[...document.querySelectorAll<HTMLElement>(".lv4-stage > .lv4-product")];
 if(cards.length<2)return false;
 const title=currentTitle();
 let index=cards.findIndex(card=>cardTitle(card)===title);
 if(index<0)index=0;
 const target=cards[(index+direction+cards.length)%cards.length];
 const image=target?.querySelector<HTMLImageElement>("img");
 if(image){image.loading="eager";image.setAttribute("fetchpriority","high");void image.decode?.().catch(()=>{})}
 target?.click();
 return Boolean(target);
}

function panWorld(direction:number){
 const world=document.querySelector<HTMLElement>(".lv4-world");
 if(!world)return;
 const rect=world.getBoundingClientRect();
 const startX=rect.left+rect.width/2,startY=rect.top+rect.height/2;
 const distance=Math.max(420,Math.min(760,rect.width*.42));
 const endX=startX-(direction*distance);
 const common={bubbles:true,cancelable:true,pointerId:91,pointerType:"mouse",isPrimary:true,buttons:1,clientY:startY};
 try{
  world.dispatchEvent(new PointerEvent("pointerdown",{...common,clientX:startX}));
  world.dispatchEvent(new PointerEvent("pointermove",{...common,clientX:endX}));
  world.dispatchEvent(new PointerEvent("pointerup",{...common,clientX:endX,buttons:0}));
 }catch{
  window.dispatchEvent(new CustomEvent("ynot:world-focus",{detail:{direction:direction>0?"right":"left",prefetch:true}}));
 }
}

export default function DesktopGlassSideControls({active=true}:{active?:boolean}){
 useEffect(()=>{
  document.documentElement.classList.add("ynot-glass-side-controls-ready");
  return()=>document.documentElement.classList.remove("ynot-glass-side-controls-ready");
 },[]);
 if(!active)return null;
 const move=(direction:number)=>{if(document.querySelector(".lv4-detail")){if(cycleProduct(direction))return}panWorld(direction)};
 return <>
  <style>{`
   .ynot-glass-side-control{position:fixed;top:52%;z-index:2147482200;width:82px;height:82px;display:grid;place-items:center;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:radial-gradient(circle at 33% 26%,rgba(255,255,255,.13),rgba(38,38,38,.43) 42%,rgba(10,10,10,.52) 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.055),inset 0 10px 26px rgba(255,255,255,.035),0 18px 52px rgba(0,0,0,.28);backdrop-filter:blur(22px) saturate(120%);-webkit-backdrop-filter:blur(22px) saturate(120%);transform:translateY(-50%);cursor:pointer;touch-action:manipulation;transition:transform .16s ease,background .16s ease,border-color .16s ease}
   .ynot-glass-side-control:hover{transform:translateY(-50%) scale(1.045);border-color:rgba(255,255,255,.26);background:radial-gradient(circle at 33% 26%,rgba(255,255,255,.16),rgba(42,42,42,.48) 42%,rgba(10,10,10,.56) 100%)}
   .ynot-glass-side-control:active{transform:translateY(-50%) scale(.97)}
   .ynot-glass-side-control.left{left:18px}.ynot-glass-side-control.right{right:18px}
   .ynot-glass-side-control i{width:19px;height:19px;border-radius:50%;display:block;background:rgba(244,244,244,.78);box-shadow:0 0 0 1px rgba(255,255,255,.28),0 2px 9px rgba(0,0,0,.24)}
   .lv4-detail .lv4-save-action{display:none!important}
   .lv4-detail>.lv4-close{position:fixed!important;top:18px!important;right:18px!important;left:auto!important;width:48px!important;height:48px!important;border-radius:999px!important;z-index:2147483646!important;display:grid!important;place-items:center!important;background:rgba(15,15,15,.72)!important;border:1px solid rgba(255,255,255,.22)!important;color:#fff!important;box-shadow:0 12px 38px rgba(0,0,0,.34)!important;backdrop-filter:blur(20px)!important;-webkit-backdrop-filter:blur(20px)!important}
   .lv4-detail>.lv4-close svg{width:20px!important;height:20px!important}
   .ynot-world-desktop-prev,.ynot-world-desktop-next,.ynot-deal-desktop-prev,.ynot-deal-desktop-next{display:none!important}
   @media(max-width:899px){.ynot-glass-side-control{display:none!important}.lv4-detail>.lv4-close{top:max(10px,env(safe-area-inset-top))!important;right:10px!important;width:46px!important;height:46px!important}}
  `}</style>
  <button type="button" className="ynot-glass-side-control left" aria-label="Move left / previous product" onClick={()=>move(-1)}><i/></button>
  <button type="button" className="ynot-glass-side-control right" aria-label="Move right / next product" onClick={()=>move(1)}><i/></button>
 </>;
}
