"use client";

import {useEffect} from "react";

const norm=(value:string)=>String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();

export default function DesktopProductStepper():null{
 useEffect(()=>{
  let frame=0;
  const sync=()=>{
   frame=0;
   document.querySelectorAll(".ynot-world-desktop-prev,.ynot-world-desktop-next").forEach(node=>node.remove());
   if(window.innerWidth<900)return;
   const detail=document.querySelector<HTMLElement>(".lv4-detail");
   if(!detail)return;
   const cards=[...document.querySelectorAll<HTMLElement>(".lv4-stage > .lv4-product")];
   if(cards.length<2)return;
   const current=norm(detail.querySelector(".lv4-detailcopy h2")?.textContent||"");
   const titleOf=(card:HTMLElement)=>norm(card.querySelector(".lv4-product-tooltip b,.lv4-orbmeta b")?.textContent||"");
   let index=cards.findIndex(card=>titleOf(card)===current);
   if(index<0)index=0;
   const move=(direction:number)=>{
    const latest=[...document.querySelectorAll<HTMLElement>(".lv4-stage > .lv4-product")];
    if(latest.length<2)return;
    const active=norm(document.querySelector(".lv4-detail .lv4-detailcopy h2")?.textContent||"");
    let i=latest.findIndex(card=>titleOf(card)===active);
    if(i<0)i=index;
    latest[(i+direction+latest.length)%latest.length]?.click();
   };
   const make=(cls:string,label:string,direction:number)=>{
    const button=document.createElement("button");
    button.type="button";
    button.className=cls;
    button.setAttribute("aria-label",label);
    button.innerHTML="<span></span>";
    button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();move(direction)});
    document.body.appendChild(button);
   };
   make("ynot-world-desktop-prev","Previous product",-1);
   make("ynot-world-desktop-next","Next product",1);
  };
  const queue=()=>{if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(sync)};
  const observer=new MutationObserver(queue);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"]});
  window.addEventListener("resize",queue);
  queue();
  return()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame);window.removeEventListener("resize",queue);document.querySelectorAll(".ynot-world-desktop-prev,.ynot-world-desktop-next").forEach(node=>node.remove())};
 },[]);
 return null;
}
