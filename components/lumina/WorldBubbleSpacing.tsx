"use client";

import {useEffect,useRef} from "react";

const WORLD_CX=100000, WORLD_CY=100000;
const BUBBLE_SIZE=126;
const PITCH=176;
type Axial={q:number;r:number};
const DIRS:Axial[]=[{q:1,r:0},{q:0,r:1},{q:-1,r:1},{q:-1,r:0},{q:0,r:-1},{q:1,r:-1}];

function ring(radius:number):Axial[]{
 if(radius===0)return[{q:0,r:0}];
 let q=-radius,r=0;const out:Axial[]=[];
 for(const d of DIRS)for(let i=0;i<radius;i++){out.push({q,r});q+=d.q;r+=d.r}
 return out;
}
function slots(count:number){const out:Axial[]=[];for(let radius=0;out.length<count&&radius<220;radius++)out.push(...ring(radius));return out.slice(0,count)}
function point(a:Axial){return{x:WORLD_CX+PITCH*(a.q+a.r/2),y:WORLD_CY+PITCH*(Math.sqrt(3)/2)*a.r}}
function place(elements:HTMLElement[]){const grid=slots(elements.length);elements.forEach((el,index)=>{const p=point(grid[index]);el.style.setProperty("left",`${p.x}px`,"important");el.style.setProperty("top",`${p.y}px`,"important");el.style.setProperty("width",`${BUBBLE_SIZE}px`,"important");el.style.setProperty("height",`${BUBBLE_SIZE}px`,"important");el.style.setProperty("--s",`${BUBBLE_SIZE}px`);el.dataset.hexSlot=String(index)})}
function normalizeWorld(){
 const shell=document.querySelector<HTMLElement>(".lv4-shell");if(!shell)return;
 // Desktop is owned exclusively by DesktopLatticeController. The old hex/scattered
 // normalizer used to race it after deep-link popups closed and could leave stale
 // coordinates behind. Never write product positions on desktop here.
 if(window.innerWidth>=900){
  shell.querySelectorAll<HTMLElement>(".lv4-product").forEach(el=>{delete el.dataset.hexSlot});
  return;
 }
 const worlds=shell.classList.contains("level-worlds");
 const elements=worlds?[...shell.querySelectorAll<HTMLElement>(".lv4-category-bubble")]:[...shell.querySelectorAll<HTMLElement>(".lv4-intent,.lv4-textbubble,.lv4-product")];
 if(elements.length)place(elements);
 shell.querySelectorAll<HTMLElement>(".lv4-zone-title,.lv4-zone-annotation,.lv4-zone-connector,.lv4-zone-detail-cluster").forEach(el=>{el.style.setProperty("display","none","important");el.setAttribute("aria-hidden","true")});
}
function hideImageCountText(){document.querySelectorAll<HTMLElement>(".lv4-detail,.ynot-selected,.ynot-story").forEach(card=>card.querySelectorAll<HTMLElement>("span,small,div").forEach(el=>{if(el.children.length)return;const text=(el.textContent||"").trim();if(/^\d+\s*(?:\/|of)\s*\d+$/i.test(text)){el.style.display="none";el.setAttribute("aria-hidden","true")}}))}

export default function WorldBubbleSpacing():null{
 const frame=useRef<number|null>(null);
 useEffect(()=>{const schedule=()=>{if(frame.current!=null)return;frame.current=requestAnimationFrame(()=>{frame.current=null;normalizeWorld();hideImageCountText()})};const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});window.addEventListener("resize",schedule);schedule();return()=>{observer.disconnect();window.removeEventListener("resize",schedule);if(frame.current!=null)cancelAnimationFrame(frame.current)}},[]);
 return null;
}
