"use client";

import {useEffect} from "react";

const WORLD_CX=100000;
const WORLD_CY=100000;

function metrics(){
 const w=typeof window!=="undefined"?window.innerWidth:1440;
 if(w<520)return{stepX:158,stepY:142,size:92};
 if(w<700)return{stepX:166,stepY:148,size:98};
 if(w<900)return{stepX:170,stepY:152,size:104};
 if(w<1100)return{stepX:172,stepY:154,size:116};
 return{stepX:176,stepY:156,size:126};
}

/*
  Fill concentric square rings instead of a one-way sequence. Each new batch
  immediately prepares rows above/below and columns left/right, so panning in
  any direction reveals already-positioned product layers rather than an empty edge.
*/
function ringCell(index:number){
 if(index<=0)return{x:0,y:0,ring:0};
 const ring=Math.ceil((Math.sqrt(index+1)-1)/2);
 const side=ring*2;
 const first=(2*ring-1)*(2*ring-1);
 let offset=index-first;
 if(offset<side)return{x:-ring+1+offset,y:-ring,ring};
 offset-=side;
 if(offset<side)return{x:ring,y:-ring+1+offset,ring};
 offset-=side;
 if(offset<side)return{x:ring-1-offset,y:ring,ring};
 offset-=side;
 return{x:-ring,y:ring-1-offset,ring};
}

function stageCamera(stage:HTMLElement){
 const raw=stage.style.transform||getComputedStyle(stage).transform||"";
 const direct=raw.match(/translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)\s*scale\(\s*([\d.]+)\s*\)/i);
 if(direct)return{panX:Number(direct[1]),panY:Number(direct[2]),zoom:Math.max(.001,Number(direct[3]))};
 const matrix=raw.match(/matrix\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/i);
 if(matrix)return{panX:Number(matrix[5]),panY:Number(matrix[6]),zoom:Math.max(.001,Math.abs(Number(matrix[1])))};
 return{panX:-WORLD_CX*.22,panY:-WORLD_CY*.22,zoom:.22};
}

function centerDesktopHome(shell:HTMLElement,stage:HTMLElement){
 if(window.innerWidth<900||!shell.classList.contains("depth-worlds"))return;
 const voice=stage.querySelector<HTMLElement>(":scope > .ynot-voice-orb");
 const categories=[...stage.querySelectorAll<HTMLElement>(":scope > .lv4-category-bubble")];
 if(!voice||!categories.length)return;
 const {panX,panY,zoom}=stageCamera(stage);
 const centerX=(window.innerWidth*.5-panX)/zoom;
 const centerY=(window.innerHeight*.5-panY)/zoom;
 voice.style.setProperty("left",`${centerX}px`,"important");
 voice.style.setProperty("top",`${centerY}px`,"important");
 const radius=Math.min(860,Math.max(620,Math.min(window.innerWidth,window.innerHeight)*2.2));
 categories.forEach((node,index)=>{
  const angle=index/categories.length*Math.PI*2-Math.PI/2;
  node.style.setProperty("left",`${centerX+Math.cos(angle)*radius}px`,"important");
  node.style.setProperty("top",`${centerY+Math.sin(angle)*radius}px`,"important");
 });
}

function applyLattice(){
 if(typeof window==="undefined")return;
 const shell=document.querySelector<HTMLElement>(".lv4-shell");
 if(!shell)return;
 const stage=shell.querySelector<HTMLElement>(".lv4-stage");
 if(!stage)return;
 centerDesktopHome(shell,stage);
 const products=[...stage.querySelectorAll<HTMLElement>(":scope > .lv4-product")];
 if(!products.length){shell.classList.remove("ynot-desktop-lattice-active");return}
 shell.classList.add("ynot-desktop-lattice-active");
 const {stepX,stepY,size}=metrics();
 products.forEach((product,index)=>{
  const cell=ringCell(index);
  const stagger=(Math.abs(cell.y)%2)*stepX*.5;
  const x=WORLD_CX+cell.x*stepX+stagger;
  const y=WORLD_CY+cell.y*stepY;
  const signature=`${stepX}:${stepY}:${size}:${cell.x}:${cell.y}:${cell.ring}`;
  if(product.dataset.ynotLattice===signature&&product.style.getPropertyPriority("left")==="important")return;
  product.dataset.ynotLattice=signature;
  product.dataset.ynotLatticeRow=String(cell.y);
  product.dataset.ynotBufferRing=String(cell.ring);
  delete product.dataset.hexSlot;
  product.style.setProperty("position","absolute","important");
  product.style.setProperty("left",`${x}px`,"important");
  product.style.setProperty("top",`${y}px`,"important");
  product.style.setProperty("width",`${size}px`,"important");
  product.style.setProperty("height",`${size}px`,"important");
  product.style.setProperty("--s",`${size}px`);
  product.style.setProperty("margin","0","important");
  product.style.setProperty("z-index",String(20+(cell.ring%3)),"important");
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
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","style"]});
  window.addEventListener("resize",schedule);
  window.addEventListener("shop:tag-search",schedule as EventListener);
  window.addEventListener("ynot:world-focus",schedule as EventListener);
  window.addEventListener("pointerup",schedule,{passive:true});
  window.addEventListener("wheel",schedule,{passive:true});
  schedule();
  const delayed=[40,90,160,280,480,780,1200,1800,2800].map(ms=>window.setTimeout(schedule,ms));
  return()=>{
   observer.disconnect();
   if(frame)cancelAnimationFrame(frame);
   delayed.forEach(clearTimeout);
   window.removeEventListener("resize",schedule);
   window.removeEventListener("shop:tag-search",schedule as EventListener);
   window.removeEventListener("ynot:world-focus",schedule as EventListener);
   window.removeEventListener("pointerup",schedule);
   window.removeEventListener("wheel",schedule);
  };
 },[]);
 return null;
}
