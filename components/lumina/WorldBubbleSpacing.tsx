"use client";

import {useEffect,useRef} from "react";

const WORLD_CX=100000, WORLD_CY=100000, PRODUCTS_PER_ZONE=32;
const PITCH=218;
const PRODUCT_SIZE=126;
const CLEARANCE=24;

type Axial={q:number;r:number};
type Point={x:number;y:number};

const HEX_DIRS:Axial[]=[{q:1,r:0},{q:0,r:1},{q:-1,r:1},{q:-1,r:0},{q:0,r:-1},{q:1,r:-1}];

function hexRing(radius:number):Axial[]{
 if(radius<=0)return[{q:0,r:0}];
 let q=-radius,r=0;const out:Axial[]=[];
 for(const d of HEX_DIRS){for(let i=0;i<radius;i++){out.push({q,r});q+=d.q;r+=d.r}}
 return out;
}

function toPoint(axial:Axial):Point{
 return{x:PITCH*(axial.q+axial.r/2),y:PITCH*(Math.sqrt(3)/2)*axial.r};
}

function protectedZones(){
 const zones:{x:number;y:number;r:number}[]=[{x:WORLD_CX,y:WORLD_CY,r:210}];
 for(let i=0;i<6;i++){
  const a=i/6*Math.PI*2-.52;
  zones.push({x:WORLD_CX+Math.cos(a)*3.25*132,y:WORLD_CY+Math.sin(a)*2.10*132,r:168});
 }
 return zones;
}
const PROTECTED=protectedZones();

function allowed(point:Point){
 const x=WORLD_CX+point.x,y=WORLD_CY+point.y,r=PRODUCT_SIZE/2+CLEARANCE;
 return PROTECTED.every(zone=>Math.hypot(x-zone.x,y-zone.y)>=zone.r+r);
}

function buildSlots(count:number){
 const slots:Point[]=[];
 // Start just outside the intent/tag ring, then continue as one uninterrupted
 // honeycomb. Every accepted neighbor uses the same pitch, so new zones do not
 // introduce different gaps or source-dependent offsets.
 for(let ring=2;slots.length<count&&ring<180;ring++){
  for(const axial of hexRing(ring)){
   const point=toPoint(axial);
   if(allowed(point))slots.push(point);
   if(slots.length>=count)break;
  }
 }
 return slots;
}

function centroid(items:HTMLElement[]):Point|null{
 if(!items.length)return null;
 let x=0,y=0,n=0;
 for(const el of items){const left=Number.parseFloat(el.style.left),top=Number.parseFloat(el.style.top);if(!Number.isFinite(left)||!Number.isFinite(top))continue;x+=left;y+=top;n++}
 return n?{x:x/n,y:y/n}:null;
}

function normalizeZoneChrome(products:HTMLElement[]){
 const zoneCount=Math.ceil(products.length/PRODUCTS_PER_ZONE);
 const centers:Point[]=[];
 for(let zone=0;zone<zoneCount;zone++){
  const center=centroid(products.slice(zone*PRODUCTS_PER_ZONE,(zone+1)*PRODUCTS_PER_ZONE));
  if(center)centers.push(center);
 }
 const annotations=[...document.querySelectorAll<HTMLElement>(".lv4-zone-annotation")];
 const connectors=[...document.querySelectorAll<HTMLElement>(".lv4-zone-connector")];
 const clusters=[...document.querySelectorAll<HTMLElement>(".lv4-zone-detail-cluster")];
 for(let zone=1;zone<centers.length;zone++){
  const current=centers[zone],previous=centers[zone-1];
  const annotation=annotations[zone-1];if(annotation){annotation.style.left=`${current.x}px`;annotation.style.top=`${current.y}px`}
  const connector=connectors[zone-1];if(connector){const dx=current.x-previous.x,dy=current.y-previous.y;connector.style.left=`${previous.x}px`;connector.style.top=`${previous.y}px`;connector.style.width=`${Math.hypot(dx,dy)}px`;connector.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`}
  const cluster=clusters[zone-1];if(cluster){cluster.style.left=`${(previous.x+current.x)/2}px`;cluster.style.top=`${(previous.y+current.y)/2}px`}
 }
}

function normalizeWorld(){
 const products=[...document.querySelectorAll<HTMLElement>(".lv4-product")];
 if(!products.length)return;
 const slots=buildSlots(products.length);
 products.forEach((el,index)=>{
  const point=slots[index];if(!point)return;
  const left=WORLD_CX+point.x,top=WORLD_CY+point.y;
  el.style.left=`${left}px`;
  el.style.top=`${top}px`;
  el.style.setProperty("--s",`${PRODUCT_SIZE}px`);
  el.dataset.equalSpacingLeft=String(left);
  el.dataset.equalSpacingTop=String(top);
 });
 normalizeZoneChrome(products);
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
