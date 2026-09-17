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
   .ynot-glass-side-control{position:fixed;top:52%;z-index:2147482200;width:58px;height:58px;display:grid;place-items:center;border-radius:999px;border:1px solid rgba(255,255,255,.24);background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.035) 42%,rgba(8,8,8,.24));box-shadow:inset 0 1px 0 rgba(255,255,255,.16),inset 0 -12px 24px rgba(0,0,0,.12),0 12px 34px rgba(0,0,0,.18);backdrop-filter:blur(28px) saturate(138%);-webkit-backdrop-filter:blur(28px) saturate(138%);transform:translateY(-50%);cursor:pointer;touch-action:manipulation;transition:transform .16s ease,background .16s ease,border-color .16s ease,box-shadow .16s ease}
   .ynot-glass-side-control:hover{transform:translateY(-50%) scale(1.055);border-color:rgba(255,255,255,.34);background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(255,255,255,.05) 44%,rgba(10,10,10,.26));box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 -12px 24px rgba(0,0,0,.12),0 14px 36px rgba(0,0,0,.22)}
   .ynot-glass-side-control:active{transform:translateY(-50%) scale(.96)}
   .ynot-glass-side-control.left{left:14px}.ynot-glass-side-control.right{right:14px}
   .ynot-glass-side-control i{width:10px;height:10px;border-radius:50%;display:block;background:rgba(250,250,250,.86);box-shadow:0 0 0 1px rgba(255,255,255,.32),0 1px 6px rgba(0,0,0,.24)}
   .lv4-detail .lv4-save-action,.lv4-detail button[aria-label*="save" i],.lv4-detail button[aria-label*="heart" i]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
   .lv4-detail>.lv4-close{position:fixed!important;top:16px!important;right:16px!important;left:auto!important;width:46px!important;height:46px!important;border-radius:999px!important;z-index:2147483646!important;display:grid!important;place-items:center!important;background:rgba(15,15,15,.62)!important;border:1px solid rgba(255,255,255,.22)!important;color:#fff!important;box-shadow:0 10px 30px rgba(0,0,0,.28)!important;backdrop-filter:blur(24px)!important;-webkit-backdrop-filter:blur(24px)!important}
   .lv4-detail>.lv4-close svg{width:19px!important;height:19px!important}
   .ynot-detail-side,.ynot-world-desktop-prev,.ynot-world-desktop-next,.ynot-deal-desktop-prev,.ynot-deal-desktop-next{display:none!important}
   .ynot-loaded-gallery{position:absolute!important;right:18px!important;bottom:18px!important;z-index:6!important;display:block!important;width:auto!important;height:auto!important;background:none!important;border:0!important;padding:0!important;margin:0!important}
   .ynot-loaded-gallery>button:not(.ynot-gallery-more){display:none!important}
   .ynot-loaded-gallery>.ynot-gallery-more{display:grid!important;place-items:center!important;width:52px!important;height:52px!important;border-radius:999px!important;padding:0!important;border:1px solid rgba(255,255,255,.28)!important;background:rgba(18,18,18,.42)!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important;color:#fff!important;overflow:hidden!important;box-shadow:0 10px 28px rgba(0,0,0,.22)!important}
   .ynot-loaded-gallery>.ynot-gallery-more img{display:none!important}
   .ynot-loaded-gallery>.ynot-gallery-more:after{content:attr(data-more)!important;position:static!important;display:block!important;font:700 13px/1 system-ui,-apple-system,sans-serif!important;color:#fff!important;background:none!important;inset:auto!important}
   .ynot-full-slider{position:fixed!important;inset:0!important;z-index:2147483645!important;display:grid!important;place-items:center!important;background:rgba(4,4,4,.74)!important;backdrop-filter:blur(24px)!important;-webkit-backdrop-filter:blur(24px)!important;padding:72px 88px!important}
   .ynot-full-slider-image{max-width:min(72vw,980px)!important;max-height:78vh!important;width:auto!important;height:auto!important;object-fit:contain!important;border-radius:24px!important;box-shadow:0 30px 90px rgba(0,0,0,.42)!important}
   .ynot-full-slider-close{position:fixed!important;top:18px!important;right:18px!important;width:46px!important;height:46px!important;border-radius:999px!important;border:1px solid rgba(255,255,255,.24)!important;background:rgba(18,18,18,.58)!important;color:#fff!important;font-size:28px!important;z-index:2!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important}
   .ynot-full-slider-prev,.ynot-full-slider-next{position:fixed!important;top:50%!important;transform:translateY(-50%)!important;width:54px!important;height:54px!important;border-radius:999px!important;border:1px solid rgba(255,255,255,.24)!important;background:rgba(18,18,18,.40)!important;color:#fff!important;font-size:36px!important;display:grid!important;place-items:center!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important}
   .ynot-full-slider-prev{left:24px!important}.ynot-full-slider-next{right:24px!important}.ynot-full-slider-count{position:fixed!important;bottom:22px!important;left:50%!important;transform:translateX(-50%)!important;color:#fff!important;background:rgba(18,18,18,.42)!important;border:1px solid rgba(255,255,255,.18)!important;padding:8px 12px!important;border-radius:999px!important;backdrop-filter:blur(16px)!important;-webkit-backdrop-filter:blur(16px)!important}
   @media(max-width:899px){.ynot-glass-side-control{display:none!important}.lv4-detail>.lv4-close{top:max(10px,env(safe-area-inset-top))!important;right:10px!important;width:46px!important;height:46px!important}.ynot-full-slider{padding:64px 18px!important}.ynot-full-slider-image{max-width:94vw!important;max-height:76vh!important}.ynot-full-slider-prev{left:10px!important}.ynot-full-slider-next{right:10px!important}}
  `}</style>
  <button type="button" className="ynot-glass-side-control left" aria-label="Move left / previous product" onClick={()=>move(-1)}><i/></button>
  <button type="button" className="ynot-glass-side-control right" aria-label="Move right / next product" onClick={()=>move(1)}><i/></button>
 </>;
}
