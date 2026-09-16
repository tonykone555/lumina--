"use client";

import {useEffect} from "react";

const WORLD_CX=100000;
const WORLD_CY=100000;
const HOME_Y_OFFSET=200;

function metrics(){
 const w=typeof window!=="undefined"?window.innerWidth:1440;
 if(w<520)return{stepX:158,stepY:142,size:92};
 if(w<700)return{stepX:166,stepY:148,size:98};
 if(w<900)return{stepX:170,stepY:152,size:104};
 if(w<1100)return{stepX:172,stepY:154,size:116};
 return{stepX:176,stepY:156,size:126};
}

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

function setImportant(node:HTMLElement,property:string,value:string){
 if(node.style.getPropertyValue(property)===value&&node.style.getPropertyPriority(property)==="important")return;
 node.style.setProperty(property,value,"important");
}

/* Home objects stay tied to the real world origin, with a small downward offset
   so the visual centre is the usable screen area between the header and search. */
function centerDesktopHome(shell:HTMLElement,stage:HTMLElement){
 if(window.innerWidth<900||!shell.classList.contains("depth-worlds"))return;
 const voice=stage.querySelector<HTMLElement>(":scope > .ynot-voice-orb");
 const categories=[...stage.querySelectorAll<HTMLElement>(":scope > .lv4-category-bubble")];
 if(!voice||!categories.length)return;
 const centerY=WORLD_CY+HOME_Y_OFFSET;
 setImportant(voice,"left",`${WORLD_CX}px`);
 setImportant(voice,"top",`${centerY}px`);
 const radius=Math.min(820,Math.max(560,Math.min(window.innerWidth,window.innerHeight)*2.0));
 categories.forEach((node,index)=>{
  const angle=index/categories.length*Math.PI*2-Math.PI/2;
  setImportant(node,"left",`${WORLD_CX+Math.cos(angle)*radius}px`);
  setImportant(node,"top",`${centerY+Math.sin(angle)*radius}px`);
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
  setImportant(product,"position","absolute");
  setImportant(product,"left",`${x}px`);
  setImportant(product,"top",`${y}px`);
  setImportant(product,"width",`${size}px`);
  setImportant(product,"height",`${size}px`);
  product.style.setProperty("--s",`${size}px`);
  setImportant(product,"margin","0");
  setImportant(product,"z-index",String(20+(cell.ring%3)));
 });
}

export default function DesktopLatticeController():null{
 useEffect(()=>{
  let frame=0;
  const schedule=()=>{
   if(frame)cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{frame=0;applyLattice()});
  };
  const observer=new MutationObserver(mutations=>{
   if(mutations.every(m=>m.target instanceof HTMLElement&&m.target.closest(".ynot-world-desktop-prev,.ynot-world-desktop-next,.ynot-deal-desktop-prev,.ynot-deal-desktop-next")))return;
   schedule();
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","style"]});
  window.addEventListener("resize",schedule);
  window.addEventListener("shop:tag-search",schedule as EventListener);
  window.addEventListener("ynot:world-focus",schedule as EventListener);
  window.addEventListener("pointerup",schedule,{passive:true});
  schedule();
  const delayed=[40,100,220,480,900].map(ms=>window.setTimeout(schedule,ms));
  return()=>{
   observer.disconnect();
   if(frame)cancelAnimationFrame(frame);
   delayed.forEach(clearTimeout);
   window.removeEventListener("resize",schedule);
   window.removeEventListener("shop:tag-search",schedule as EventListener);
   window.removeEventListener("ynot:world-focus",schedule as EventListener);
   window.removeEventListener("pointerup",schedule);
  };
 },[]);
 return null;
}
