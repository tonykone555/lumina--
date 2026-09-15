"use client";

import {useEffect} from "react";

const WORLD_CX=100000;
const WORLD_CY=100000;

function spacing(){
 const w=typeof window!=="undefined"?window.innerWidth:1440;
 if(w<700)return{stepX:128,stepY:116};
 if(w<1100)return{stepX:146,stepY:130};
 return{stepX:166,stepY:148};
}

function spiralCell(index:number){
 if(index<=0)return{x:0,y:0};
 let x=0,y=0,dx=1,dy=0,segmentLength=1,segmentPassed=0,turns=0;
 for(let i=0;i<index;i++){
  x+=dx;y+=dy;segmentPassed+=1;
  if(segmentPassed===segmentLength){
   segmentPassed=0;
   const nextDx=-dy,nextDy=dx;dx=nextDx;dy=nextDy;turns+=1;
   if(turns%2===0)segmentLength+=1;
  }
 }
 return{x,y};
}

function applyLattice(){
 if(typeof window==="undefined")return;
 const shell=document.querySelector<HTMLElement>(".lv4-shell");
 if(!shell)return;
 const stage=shell.querySelector<HTMLElement>(".lv4-stage");
 if(!stage)return;
 const products=[...stage.querySelectorAll<HTMLElement>(":scope > .lv4-product")];
 if(!products.length){shell.classList.remove("ynot-desktop-lattice-active");return}
 shell.classList.add("ynot-desktop-lattice-active");
 const {stepX,stepY}=spacing();
 products.forEach((product,index)=>{
  const cell=spiralCell(index);
  const stagger=(Math.abs(cell.y)%2)*stepX*.5;
  const x=WORLD_CX+cell.x*stepX+stagger;
  const y=WORLD_CY+cell.y*stepY;
  const signature=`${stepX}:${stepY}:${cell.x}:${cell.y}`;
  if(product.dataset.ynotLattice===signature&&product.style.getPropertyPriority("left")==="important")return;
  product.dataset.ynotLattice=signature;
  product.dataset.ynotLatticeRow=String(cell.y);
  delete product.dataset.hexSlot;
  product.style.setProperty("position","absolute","important");
  product.style.setProperty("left",`${x}px`,"important");
  product.style.setProperty("top",`${y}px`,"important");
  product.style.setProperty("margin","0","important");
  product.style.setProperty("z-index",String(20+(Math.abs(cell.x+cell.y)%3)),"important");
 });
}

export default function DesktopLatticeController():null{
 useEffect(()=>{
  let frame=0;
  const schedule=()=>{
   if(frame)cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{frame=0;applyLattice()});
  };
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,childList:true});
  window.addEventListener("resize",schedule);
  window.addEventListener("shop:tag-search",schedule as EventListener);
  window.addEventListener("ynot:world-focus",schedule as EventListener);
  schedule();
  const delayed=[100,280,650,1200,2200].map(ms=>window.setTimeout(schedule,ms));
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
