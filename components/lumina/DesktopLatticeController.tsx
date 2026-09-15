"use client";

import {useEffect} from "react";

const WORLD_CX=100000;
const WORLD_CY=100000;

function applyDesktopLattice(){
 if(typeof window==="undefined"||window.innerWidth<900)return;
 const shell=document.querySelector<HTMLElement>(".lv4-shell");
 if(!shell)return;
 const stage=shell.querySelector<HTMLElement>(".lv4-stage");
 if(!stage)return;
 const products=[...stage.querySelectorAll<HTMLElement>(":scope > .lv4-product")];
 if(!products.length){shell.classList.remove("ynot-desktop-lattice-active");return}
 shell.classList.add("ynot-desktop-lattice-active");
 const cols=window.innerWidth>=1560?9:window.innerWidth>=1220?8:7;
 const stepX=166;
 const stepY=148;
 const totalWidth=(cols-1)*stepX;
 const startX=WORLD_CX-totalWidth/2-stepX*.25;
 const startY=WORLD_CY-370;
 products.forEach((product,index)=>{
  const row=Math.floor(index/cols);
  const col=index%cols;
  const stagger=row%2?stepX/2:0;
  const x=startX+col*stepX+stagger;
  const y=startY+row*stepY;
  const signature=`${cols}:${row}:${col}`;
  if(product.dataset.ynotLattice===signature&&product.style.getPropertyPriority("left")==="important")return;
  product.dataset.ynotLattice=signature;
  product.dataset.ynotLatticeRow=String(row);
  product.style.setProperty("position","absolute","important");
  product.style.setProperty("left",`${x}px`,"important");
  product.style.setProperty("top",`${y}px`,"important");
  product.style.setProperty("margin","0","important");
  product.style.setProperty("z-index",String(20+(row%3)),"important");
 });
}

export default function DesktopLatticeController():null{
 useEffect(()=>{
  let frame=0;
  const schedule=()=>{
   if(frame)cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{frame=0;applyDesktopLattice()});
  };
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  window.addEventListener("resize",schedule);
  window.addEventListener("shop:tag-search",schedule as EventListener);
  window.addEventListener("ynot:world-focus",schedule as EventListener);
  schedule();
  const delayed=[120,420,900].map(ms=>window.setTimeout(schedule,ms));
  return()=>{
   observer.disconnect();
   if(frame)cancelAnimationFrame(frame);
   delayed.forEach(clearTimeout);
   window.removeEventListener("resize",schedule);
   window.removeEventListener("shop:tag-search",schedule as EventListener);
   window.removeEventListener("ynot:world-focus",schedule as EventListener);
  };
 },[]);
 return null;
}
