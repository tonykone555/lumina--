"use client";
import {useEffect} from "react";

export default function RoomProductFullscreen(){
 useEffect(()=>{
  let startX=0,startY=0,active:HTMLElement|null=null;
  const down=(e:TouchEvent)=>{const card=(e.target as Element|null)?.closest<HTMLElement>(".yr-modal .yr-card");if(!card)return;active=card;startX=e.touches[0]?.clientX||0;startY=e.touches[0]?.clientY||0};
  const up=(e:TouchEvent)=>{if(!active)return;const x=e.changedTouches[0]?.clientX||0,y=e.changedTouches[0]?.clientY||0,dx=x-startX,dy=y-startY,card=active;active=null;if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.15)return;const choices=[...card.querySelectorAll<HTMLButtonElement>(".yr-similar button")];if(!choices.length)return;card.classList.add(dx<0?"yr-swipe-left":"yr-swipe-right");window.setTimeout(()=>{const next=dx<0?choices[0]:choices[choices.length-1];next?.click();card.classList.remove("yr-swipe-left","yr-swipe-right")},115)};
  document.addEventListener("touchstart",down,{passive:true});document.addEventListener("touchend",up,{passive:true});
  return()=>{document.removeEventListener("touchstart",down);document.removeEventListener("touchend",up)};
 },[]);
 return <style jsx global>{`
 .yr-modal{padding:0!important;place-items:stretch!important;background:rgba(4,6,6,.26)!important;backdrop-filter:blur(24px) saturate(125%)!important;-webkit-backdrop-filter:blur(24px) saturate(125%)!important;overflow:hidden!important}
 .yr-modal .yr-card{width:100%!important;max-width:none!important;height:100dvh!important;min-height:100vh!important;border-radius:0!important;padding:max(18px,env(safe-area-inset-top)) clamp(16px,4vw,34px) max(18px,env(safe-area-inset-bottom))!important;display:flex!important;flex-direction:column!important;overflow-y:auto!important;overscroll-behavior:contain!important;background:rgba(255,255,255,.055)!important;border:0!important;box-shadow:inset 0 1px rgba(255,255,255,.11)!important;backdrop-filter:blur(34px) saturate(145%)!important;-webkit-backdrop-filter:blur(34px) saturate(145%)!important;touch-action:pan-y!important;transition:transform .14s ease,opacity .14s ease!important}
 .yr-modal .yr-card-img{width:100%!important;max-width:760px!important;height:min(58dvh,680px)!important;aspect-ratio:auto!important;object-fit:contain!important;margin:12px auto 0!important;border-radius:28px!important;background:rgba(255,255,255,.025)!important}
 .yr-modal .yr-card-title{font-size:clamp(24px,6vw,38px)!important;line-height:1.04!important;letter-spacing:-.035em!important;max-height:none!important;margin:20px 0 8px!important;max-width:760px!important}
 .yr-modal .yr-card>b{font-size:18px!important}.yr-modal .yr-actions{width:100%!important;max-width:760px!important;margin-top:18px!important}.yr-modal .yr-pill{min-height:48px!important}
 .yr-modal .yr-similar{width:100%!important;max-width:760px!important;margin-top:20px!important;padding:4px 0 10px!important;gap:10px!important;scrollbar-width:none!important}.yr-modal .yr-similar::-webkit-scrollbar{display:none}.yr-modal .yr-similar img{width:62px!important;height:62px!important;border:1px solid rgba(255,255,255,.16)!important;background:rgba(255,255,255,.035)!important}
 .yr-modal .yr-card:after{content:"Swipe for next match";order:99;display:block;text-align:center;margin:14px auto 0;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.38)}
 .yr-modal .yr-card.yr-swipe-left{transform:translateX(-5%);opacity:.68}.yr-modal .yr-card.yr-swipe-right{transform:translateX(5%);opacity:.68}
 @media(min-width:800px){.yr-modal{padding:22px!important;place-items:center!important}.yr-modal .yr-card{width:min(880px,94vw)!important;height:min(900px,94vh)!important;min-height:0!important;border-radius:38px!important;border:1px solid rgba(255,255,255,.14)!important;padding:24px 28px!important}}
 `}</style>
}
