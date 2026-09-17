"use client";

import {useEffect} from "react";

const WORLD_CX=100000;
const WORLD_CY=100000;
const HOME_Y_OFFSET=0;
const PRODUCT_Y_OFFSET=340;
const DESKTOP_COLUMNS=39;

function metrics(){
 const w=typeof window!=="undefined"?window.innerWidth:1440;
 if(w<520)return{stepX:158,stepY:142,size:92};
 if(w<700)return{stepX:166,stepY:148,size:98};
 if(w<900)return{stepX:170,stepY:152,size:104};
 if(w<1100)return{stepX:172,stepY:154,size:116};
 return{stepX:176,stepY:156,size:126};
}

function signedSpread(index:number){if(index<=0)return 0;const n=Math.ceil(index/2);return index%2===1?n:-n}
function horizontalCell(index:number){const row=Math.floor(index/DESKTOP_COLUMNS),local=index%DESKTOP_COLUMNS,x=signedSpread(local),y=signedSpread(row);return{x,y,ring:Math.max(Math.abs(x),Math.abs(y))}}
function setImportant(node:HTMLElement,property:string,value:string){if(node.style.getPropertyValue(property)===value&&node.style.getPropertyPriority(property)==="important")return;node.style.setProperty(property,value,"important")}

function centerDesktopHome(shell:HTMLElement,stage:HTMLElement){
 if(window.innerWidth<900||!shell.classList.contains("depth-worlds"))return;
 const voice=stage.querySelector<HTMLElement>(":scope > .ynot-voice-orb");
 const categories=[...stage.querySelectorAll<HTMLElement>(":scope > .lv4-category-bubble")];
 if(!voice||!categories.length)return;
 const centerY=WORLD_CY+HOME_Y_OFFSET;
 setImportant(voice,"left",`${WORLD_CX}px`);setImportant(voice,"top",`${centerY}px`);
 const radius=Math.min(760,Math.max(520,Math.min(window.innerWidth,window.innerHeight)*1.78));
 categories.forEach((node,index)=>{const angle=index/categories.length*Math.PI*2-Math.PI/2;setImportant(node,"left",`${WORLD_CX+Math.cos(angle)*radius}px`);setImportant(node,"top",`${centerY+Math.sin(angle)*radius}px`)})
}

function warmImages(products:HTMLElement[]){
 if(window.innerWidth<900)return;
 products.forEach((product,index)=>{
  const image=product.querySelector<HTMLImageElement>("img");if(!image)return;
  if(index<12){image.loading="eager";image.setAttribute("fetchpriority","high");void image.decode?.().catch(()=>{})}
  else{image.loading="lazy";image.setAttribute("fetchpriority","low")}
 })
}

function applyLattice(){
 if(typeof window==="undefined")return;
 const shell=document.querySelector<HTMLElement>(".lv4-shell");if(!shell)return;
 const stage=shell.querySelector<HTMLElement>(".lv4-stage");if(!stage)return;
 centerDesktopHome(shell,stage);
 const products=[...stage.querySelectorAll<HTMLElement>(":scope > .lv4-product")];
 if(!products.length){shell.classList.remove("ynot-desktop-lattice-active");return}
 shell.classList.add("ynot-desktop-lattice-active");warmImages(products);
 const {stepX,stepY,size}=metrics();
 products.forEach((product,index)=>{const cell=horizontalCell(index),stagger=(Math.abs(cell.y)%2)*stepX*.5,x=WORLD_CX+cell.x*stepX+stagger,y=WORLD_CY+PRODUCT_Y_OFFSET+cell.y*stepY,signature=`stable5:${stepX}:${stepY}:${size}:${cell.x}:${cell.y}`;if(product.dataset.ynotLattice===signature&&product.style.getPropertyPriority("left")==="important")return;product.dataset.ynotLattice=signature;product.dataset.ynotLatticeRow=String(cell.y);product.dataset.ynotBufferRing=String(cell.ring);delete product.dataset.hexSlot;setImportant(product,"position","absolute");setImportant(product,"left",`${x}px`);setImportant(product,"top",`${y}px`);setImportant(product,"width",`${size}px`);setImportant(product,"height",`${size}px`);product.style.setProperty("--s",`${size}px`);setImportant(product,"margin","0");setImportant(product,"z-index",String(20+(Math.abs(cell.y)%3)))})
}

export default function DesktopLatticeController():null{
 useEffect(()=>{
  let frame=0,stageObserver:MutationObserver|null=null,rebindTimer:number|null=null;
  const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;applyLattice()})};
  const bindStage=()=>{stageObserver?.disconnect();const stage=document.querySelector<HTMLElement>(".lv4-stage");if(!stage)return false;stageObserver=new MutationObserver(mutations=>{if(mutations.some(m=>m.type==="childList"&&(m.addedNodes.length||m.removedNodes.length)))schedule()});stageObserver.observe(stage,{childList:true});return true};
  schedule();bindStage();
  const delayed=[80,260].map(ms=>window.setTimeout(()=>{bindStage();schedule()},ms));
  const onResize=()=>schedule(),onSearch=()=>{window.setTimeout(()=>{bindStage();schedule()},0)},onFocus=()=>schedule();
  window.addEventListener("resize",onResize,{passive:true});window.addEventListener("shop:tag-search",onSearch as EventListener);window.addEventListener("ynot:world-focus",onFocus as EventListener);
  rebindTimer=window.setInterval(()=>{if(!document.querySelector(".lv4-stage")){stageObserver?.disconnect();stageObserver=null}else if(!stageObserver)bindStage()},2000);
  return()=>{stageObserver?.disconnect();if(frame)cancelAnimationFrame(frame);delayed.forEach(clearTimeout);if(rebindTimer)clearInterval(rebindTimer);window.removeEventListener("resize",onResize);window.removeEventListener("shop:tag-search",onSearch as EventListener);window.removeEventListener("ynot:world-focus",onFocus as EventListener)}
 },[]);
 return null;
}
