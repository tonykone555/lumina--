"use client";

import {useEffect} from "react";

const PER_RING=8;
const PER_ZONE=32;
const RING_UNIT=132;
const BASE_RADIUS=2.45;
const RING_STEP=1.65;
const ANGLE_OFFSET=.34;

function numberStyle(el:HTMLElement,key:"left"|"top"){
 const raw=el.style[key];
 const value=Number.parseFloat(raw||"");
 return Number.isFinite(value)?value:0;
}

function arrangeWorld(){
 const products=[...document.querySelectorAll<HTMLElement>(".lv4-product")];
 if(!products.length)return;
 for(let start=0;start<products.length;start+=PER_ZONE){
  const group=products.slice(start,start+PER_ZONE);
  if(!group.length)continue;
  const xs=group.map(el=>numberStyle(el,"left")).filter(Boolean),ys=group.map(el=>numberStyle(el,"top")).filter(Boolean);
  if(!xs.length||!ys.length)continue;
  const centerX=xs.reduce((a,b)=>a+b,0)/xs.length,centerY=ys.reduce((a,b)=>a+b,0)/ys.length;
  group.forEach((el,local)=>{
   const ring=Math.floor(local/PER_RING),slot=local%PER_RING;
   const radius=(BASE_RADIUS+ring*RING_STEP)*RING_UNIT;
   const angle=-Math.PI/2+slot/PER_RING*Math.PI*2+(ring%2?ANGLE_OFFSET:0);
   el.style.left=`${centerX+Math.cos(angle)*radius}px`;
   el.style.top=`${centerY+Math.sin(angle)*radius}px`;
   el.dataset.ynotLayer=String(ring+1);
   el.dataset.ynotAngle=angle.toFixed(4);
  });
 }
}

function enhanceGallery(gallery:HTMLElement){
 if(gallery.dataset.ynotSlider==="1")return;
 const thumbs=[...gallery.querySelectorAll<HTMLButtonElement>(":scope > button")].filter(button=>!button.classList.contains("ynot-slider-prev")&&!button.classList.contains("ynot-slider-next"));
 if(thumbs.length<2)return;
 gallery.dataset.ynotSlider="1";
 gallery.classList.add("ynot-mini-slider");
 let index=Math.max(0,thumbs.findIndex(button=>button.classList.contains("active")));
 if(index<0)index=0;
 thumbs.forEach((button,i)=>{button.classList.add("ynot-slide-thumb");button.classList.toggle("is-current",i===index)});
 const prev=document.createElement("button"),next=document.createElement("button"),counter=document.createElement("span");
 prev.type="button";next.type="button";prev.className="ynot-slider-prev";next.className="ynot-slider-next";counter.className="ynot-slider-counter";
 prev.setAttribute("aria-label","Previous product image");next.setAttribute("aria-label","Next product image");prev.textContent="‹";next.textContent="›";
 const show=(nextIndex:number)=>{
  index=(nextIndex+thumbs.length)%thumbs.length;
  thumbs.forEach((button,i)=>button.classList.toggle("is-current",i===index));
  counter.textContent=`${index+1} / ${thumbs.length}`;
  thumbs[index]?.click();
 };
 prev.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();show(index-1)});
 next.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();show(index+1)});
 counter.textContent=`${index+1} / ${thumbs.length}`;
 gallery.prepend(prev);gallery.append(counter,next);
}

function enhanceAllGalleries(){
 document.querySelectorAll<HTMLElement>(".lv4-gallery,.ynot-rich-gallery,.ynot-loaded-gallery").forEach(enhanceGallery);
}

export default function WorldVisualPolish():null{
 useEffect(()=>{
  let frame=0;
  const sync=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{arrangeWorld();enhanceAllGalleries()})};
  sync();
  const observer=new MutationObserver(sync);
  observer.observe(document.body,{subtree:true,childList:true});
  window.addEventListener("shop:tag-search",sync as EventListener);
  window.addEventListener("resize",sync);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener("shop:tag-search",sync as EventListener);window.removeEventListener("resize",sync)};
 },[]);
 return null;
}
