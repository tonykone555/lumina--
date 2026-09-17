"use client";

import {useEffect,useState} from "react";

function norm(value:string){return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}

export default function DesktopDetailStepper(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  let frame=0;
  const sync=()=>{frame=0;setVisible(window.innerWidth>=900&&Boolean(document.querySelector('.lv4-detail'))&&document.querySelectorAll('.lv4-stage > .lv4-product').length>1)};
  const queue=()=>{if(frame)return;frame=requestAnimationFrame(sync)};
  const observer=new MutationObserver(queue);observer.observe(document.body,{subtree:true,childList:true});window.addEventListener('resize',queue,{passive:true});sync();
  return()=>{observer.disconnect();window.removeEventListener('resize',queue);if(frame)cancelAnimationFrame(frame)};
 },[]);
 const move=(direction:number)=>{
  const cards=[...document.querySelectorAll<HTMLElement>('.lv4-stage > .lv4-product')];if(cards.length<2)return;
  const current=norm(document.querySelector('.lv4-detail .lv4-detailcopy h2')?.textContent||'');
  let index=cards.findIndex(card=>norm(card.querySelector('.lv4-product-tooltip b')?.textContent||'')===current);if(index<0)index=0;
  const target=cards[(index+direction+cards.length)%cards.length];
  target?.querySelector<HTMLImageElement>('img')?.decode?.().catch(()=>{});target?.click();
 };
 return <>{visible&&<><button className="ynot-detail-side ynot-detail-side-left" onClick={()=>move(-1)} aria-label="Previous product">‹</button><button className="ynot-detail-side ynot-detail-side-right" onClick={()=>move(1)} aria-label="Next product">›</button></>}<style jsx global>{`
 .lv4-detail>.lv4-close{position:fixed!important;top:max(16px,env(safe-area-inset-top))!important;right:18px!important;left:auto!important;z-index:2147483646!important;width:46px!important;height:46px!important;display:grid!important;place-items:center!important;border-radius:999px!important;pointer-events:auto!important}
 .lv4-detail .lv4-save-action{display:none!important}
 .ynot-detail-side{position:fixed;top:50%;transform:translateY(-50%);z-index:2147483000;width:52px;height:82px;border:1px solid rgba(255,255,255,.16);background:rgba(12,13,13,.64);color:#fff;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);font:300 38px/1 system-ui;border-radius:22px;display:grid;place-items:center;cursor:pointer;box-shadow:0 16px 44px rgba(0,0,0,.24)}
 .ynot-detail-side-left{left:18px}.ynot-detail-side-right{right:18px}
 @media(max-width:899px){.ynot-detail-side{display:none!important}.lv4-detail>.lv4-close{top:max(10px,env(safe-area-inset-top))!important;right:10px!important}}
 `}</style></>;
}
