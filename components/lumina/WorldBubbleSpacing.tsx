"use client";

import {useEffect,useRef} from "react";

const WORLD_CX=100000, WORLD_CY=100000, ZONE_STEP=1320, PRODUCTS_PER_ZONE=32;
const PITCH=260;

type Axial={q:number;r:number};

function zoneCenter(zone:number,offsetX=0){
 if(zone<=0)return{x:WORLD_CX+offsetX,y:WORLD_CY};
 const angle=zone*2.399963229728653;
 const radius=ZONE_STEP*Math.sqrt(zone);
 return{x:WORLD_CX+offsetX+Math.cos(angle)*radius,y:WORLD_CY+Math.sin(angle)*radius};
}

function hexRing(radius:number):Axial[]{
 if(radius<=0)return[{q:0,r:0}];
 const dirs:Axial[]=[{q:1,r:0},{q:0,r:1},{q:-1,r:1},{q:-1,r:0},{q:0,r:-1},{q:1,r:-1}];
 let q=-radius,r=0;const out:Axial[]=[];
 for(const d of dirs){for(let i=0;i<radius;i++){out.push({q,r});q+=d.q;r+=d.r}}
 return out;
}

function evenPick<T>(items:T[],count:number){
 if(count>=items.length)return items;
 const out:T[]=[];for(let i=0;i<count;i++)out.push(items[Math.floor(i*items.length/count)]);
 return out;
}

const SLOTS:Axial[]=[
 ...evenPick(hexRing(2),8),
 ...evenPick(hexRing(3),12),
 ...evenPick(hexRing(4),12),
];

function toPoint(axial:Axial){
 return{x:PITCH*(axial.q+axial.r/2),y:PITCH*(Math.sqrt(3)/2)*axial.r};
}

function normalizeWorld(){
 const products=[...document.querySelectorAll<HTMLElement>(".lv4-product")];
 if(!products.length)return;
 const split=Boolean(document.querySelector(".lv4-source-anchor.shopify,.lv4-source-anchor.amazon"));
 let shopifyIndex=0,amazonIndex=0,otherIndex=0;
 products.forEach((el,index)=>{
  let local=index,offset=0;
  if(split){
   if(el.classList.contains("source-shopify")){local=shopifyIndex++;offset=-980}
   else if(el.classList.contains("source-amazon")){local=amazonIndex++;offset=980}
   else local=otherIndex++;
  }
  const zone=Math.floor(local/PRODUCTS_PER_ZONE),slot=local%PRODUCTS_PER_ZONE,center=zoneCenter(zone,offset),p=toPoint(SLOTS[slot]);
  const left=center.x+p.x,top=center.y+p.y;
  if(el.dataset.equalSpacingLeft!==String(left)){el.style.left=`${left}px`;el.dataset.equalSpacingLeft=String(left)}
  if(el.dataset.equalSpacingTop!==String(top)){el.style.top=`${top}px`;el.dataset.equalSpacingTop=String(top)}
 });
}

function hideImageCountText(){
 document.querySelectorAll<HTMLElement>(".lv4-detail,.ynot-selected,.ynot-story").forEach(card=>{
  card.querySelectorAll<HTMLElement>("span,small,div").forEach(el=>{
   if(el.children.length)return;
   const text=(el.textContent||"").trim();
   if(/^\d+\s*(?:\/|of)\s*\d+$/i.test(text)){el.style.display="none";el.setAttribute("aria-hidden","true")}
  });
 });
}

export default function WorldBubbleSpacing(){
 const frame=useRef<number|null>(null);
 useEffect(()=>{
  const schedule=()=>{if(frame.current!=null)return;frame.current=requestAnimationFrame(()=>{frame.current=null;normalizeWorld();hideImageCountText()})};
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  window.addEventListener("resize",schedule);
  schedule();
  return()=>{observer.disconnect();window.removeEventListener("resize",schedule);if(frame.current!=null)cancelAnimationFrame(frame.current)};
 },[]);
 return null;
}
