"use client";
import {useEffect} from "react";

export default function RoomProductFullscreen(){
 useEffect(()=>{
  let startX=0,startY=0,active:HTMLElement|null=null;
  const down=(e:TouchEvent)=>{const card=(e.target as Element|null)?.closest<HTMLElement>(".yr-modal .yr-card");if(!card)return;active=card;startX=e.touches[0]?.clientX||0;startY=e.touches[0]?.clientY||0};
  const up=(e:TouchEvent)=>{if(!active)return;const target=e.target as Element|null;const x=e.changedTouches[0]?.clientX||0,y=e.changedTouches[0]?.clientY||0,dx=x-startX,dy=y-startY,card=active;active=null;
   /* The similar-product rail owns horizontal gestures. Never turn its swipe into a whole-product change. */
   if(target?.closest(".yr-similar"))return;
   if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.15)return;const choices=[...card.querySelectorAll<HTMLButtonElement>(".yr-similar button")];if(!choices.length)return;card.classList.add(dx<0?"yr-swipe-left":"yr-swipe-right");window.setTimeout(()=>{const next=dx<0?choices[0]:choices[choices.length-1];next?.click();card.classList.remove("yr-swipe-left","yr-swipe-right")},115)};
  document.addEventListener("touchstart",down,{passive:true});document.addEventListener("touchend",up,{passive:true});
  return()=>{document.removeEventListener("touchstart",down);document.removeEventListener("touchend",up)};
 },[]);
 return <style jsx global>{`
 .yr-modal{padding:0!important;place-items:stretch!important;background:rgba(4,6,6,.26)!important;backdrop-filter:blur(24px) saturate(125%)!important;-webkit-backdrop-filter:blur(24px) saturate(125%)!important;overflow:hidden!important}
 .yr-modal .yr-card{box-sizing:border-box!important;width:100%!important;max-width:none!important;height:100dvh!important;min-height:0!important;border-radius:0!important;padding:max(18px,env(safe-area-inset-top)) clamp(16px,4vw,34px) max(40px,calc(env(safe-area-inset-bottom) + 24px))!important;display:flex!important;flex-direction:column!important;overflow-x:hidden!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain!important;background:rgba(255,255,255,.055)!important;border:0!important;box-shadow:inset 0 1px rgba(255,255,255,.11)!important;backdrop-filter:blur(34px) saturate(145%)!important;-webkit-backdrop-filter:blur(34px) saturate(145%)!important;touch-action:pan-y!important;transition:transform .14s ease,opacity .14s ease!important}
 .yr-modal .yr-card-img{flex:0 0 auto!important;width:100%!important;max-width:760px!important;height:min(56dvh,680px)!important;min-height:320px!important;aspect-ratio:auto!important;object-fit:contain!important;margin:12px auto 0!important;border-radius:28px!important;background:rgba(255,255,255,.025)!important}
 .yr-modal .yr-card-title{flex:0 0 auto!important;font-size:clamp(24px,6vw,38px)!important;line-height:1.08!important;letter-spacing:-.035em!important;max-height:none!important;height:auto!important;overflow:visible!important;white-space:normal!important;text-overflow:clip!important;margin:20px 0 8px!important;max-width:760px!important;padding:0 1px!important}
 .yr-modal .yr-card>b{flex:0 0 auto!important;font-size:18px!important}.yr-modal .yr-actions{flex:0 0 auto!important;width:100%!important;max-width:760px!important;margin-top:18px!important}.yr-modal .yr-pill{min-height:48px!important}
 .yr-modal .yr-similar{box-sizing:border-box!important;flex:0 0 auto!important;width:100%!important;max-width:none!important;min-height:92px!important;margin:22px 0 0!important;padding:7px 4px 18px!important;display:flex!important;flex-wrap:nowrap!important;align-items:center!important;gap:14px!important;overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-x:contain!important;touch-action:pan-x!important;scroll-snap-type:x proximity!important;scrollbar-width:none!important}.yr-modal .yr-similar::-webkit-scrollbar{display:none}.yr-modal .yr-similar button{flex:0 0 auto!important;scroll-snap-align:start!important}.yr-modal .yr-similar img{display:block!important;width:68px!important;height:68px!important;border-radius:50%!important;object-fit:contain!important;border:1px solid rgba(255,255,255,.16)!important;background:rgba(255,255,255,.035)!important}
 .yr-modal .yr-card:after{content:"Swipe for next match";flex:0 0 auto!important;order:99;display:block;text-align:center;margin:18px auto 12px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.38)}
 .yr-modal .yr-card.yr-swipe-left{transform:translateX(-5%);opacity:.68}.yr-modal .yr-card.yr-swipe-right{transform:translateX(5%);opacity:.68}
 @media(max-width:700px){.yr-modal .yr-card-img{height:auto!important;min-height:0!important;max-height:none!important;aspect-ratio:4/5!important}.yr-modal .yr-card-title{font-size:30px!important;margin-top:22px!important}.yr-modal .yr-similar{min-height:100px!important;padding-bottom:22px!important}}
 @media(min-width:800px){.yr-modal{padding:22px!important;place-items:center!important}.yr-modal .yr-card{width:min(880px,94vw)!important;height:min(900px,94vh)!important;min-height:0!important;border-radius:38px!important;border:1px solid rgba(255,255,255,.14)!important;padding:24px 28px 34px!important}.yr-modal .yr-similar{max-width:760px!important}}
 `}</style>
}
