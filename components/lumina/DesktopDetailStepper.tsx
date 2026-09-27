"use client";

import {useEffect,useState} from "react";

function norm(value:string){return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function cards(){return [...document.querySelectorAll<HTMLElement>('.lv4-product')].filter((node,index,list)=>node.isConnected&&list.indexOf(node)===index)}
function titleOf(card:HTMLElement){return norm(card.querySelector('.lv4-product-tooltip b,.lv4-orbmeta b')?.textContent||card.getAttribute('aria-label')||card.getAttribute('data-product-title')||'')}

export default function DesktopDetailStepper(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  let frame=0;
  const sync=()=>{frame=0;setVisible(window.innerWidth>=900&&Boolean(document.querySelector('.lv4-detail'))&&cards().length>1)};
  const queue=()=>{if(frame)return;frame=requestAnimationFrame(sync)};
  const observer=new MutationObserver(queue);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});window.addEventListener('resize',queue,{passive:true});sync();
  return()=>{observer.disconnect();window.removeEventListener('resize',queue);if(frame)cancelAnimationFrame(frame)};
 },[]);
 const move=(direction:number)=>{
  const list=cards();if(list.length<2)return;
  const detail=document.querySelector<HTMLElement>('.lv4-detail');
  const current=norm(detail?.querySelector('.lv4-detailcopy h2,h2')?.textContent||'');
  const activeId=detail?.dataset.productId||detail?.getAttribute('data-product-id')||'';
  let index=activeId?list.findIndex(card=>(card.dataset.productId||card.getAttribute('data-product-id')||'')===activeId):-1;
  if(index<0)index=list.findIndex(card=>titleOf(card)===current);
  if(index<0)index=list.findIndex(card=>card.classList.contains('active')||card.getAttribute('aria-current')==='true');
  if(index<0)index=0;
  const target=list[(index+direction+list.length)%list.length];if(!target)return;
  target.querySelector<HTMLImageElement>('img')?.decode?.().catch(()=>{});
  target.click();
 };
 return <>{visible&&<><button className="ynot-detail-side ynot-detail-side-left" onClick={()=>move(-1)} aria-label="Previous product">‹</button><button className="ynot-detail-side ynot-detail-side-right" onClick={()=>move(1)} aria-label="Next product">›</button></>}<style jsx global>{`
 .lv4-detail>.lv4-close{position:absolute!important;top:12px!important;right:12px!important;left:auto!important;z-index:2147483646!important;width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;max-width:28px!important;max-height:28px!important;padding:0!important;margin:0!important;display:grid!important;place-items:center!important;border-radius:999px!important;pointer-events:auto!important;font-size:15px!important;line-height:1!important}
 .lv4-detail .lv4-save-action,.lv4-detail>.lv4-save-action,.lv4-detail .ynot-save-action,.lv4-detail .ynot-detail-heart,.lv4-detail>[class*="save"]:not(.lv4-bag),.lv4-detail>[class*="heart"]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
 .ynot-detail-side{position:fixed;top:50%;transform:translateY(-50%);z-index:2147483646;width:52px;height:82px;border:1px solid rgba(255,255,255,.16);background:rgba(12,13,13,.64);color:#fff;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);font:300 38px/1 system-ui;border-radius:22px;display:grid;place-items:center;cursor:pointer;pointer-events:auto!important;box-shadow:0 16px 44px rgba(0,0,0,.24)}
 .ynot-detail-side-left{left:18px}.ynot-detail-side-right{right:18px}
 @media(max-width:899px){.ynot-detail-side{display:none!important}.lv4-detail>.lv4-close{top:9px!important;right:9px!important;width:26px!important;height:26px!important;min-width:26px!important;min-height:26px!important;max-width:26px!important;max-height:26px!important;font-size:14px!important}}
 `}</style></>;
}
