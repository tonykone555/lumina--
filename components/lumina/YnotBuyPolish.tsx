"use client";

import {useEffect} from "react";

function applyLabels(){
 document.querySelectorAll<HTMLElement>(".ynot-unified-add span,.ynot-shop span").forEach(label=>{
  const busy=/verifying|adding/i.test(label.textContent||"");
  if(!busy&&label.textContent!=="ADD TO BAG")label.textContent="ADD TO BAG";
 });
 document.querySelectorAll<HTMLButtonElement>(".ynot-story-action").forEach(button=>{
  button.querySelectorAll("svg").forEach(icon=>icon.setAttribute("aria-hidden","true"));
  let label=button.querySelector<HTMLElement>(".ynot-buy-label");
  if(!label){
   [...button.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).forEach(node=>node.remove());
   label=document.createElement("span");
   label.className="ynot-buy-label";
   button.appendChild(label);
  }
  label.textContent="ADD TO BAG";
 });
 document.querySelectorAll<HTMLButtonElement>(".ynot-unified-add,.ynot-shop,.ynot-story-action").forEach(button=>{
  button.setAttribute("aria-label","Add to bag");
 });
}

export default function YnotBuyPolish():null{
 useEffect(()=>{
  let frame=0;
  const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;applyLabels()})};
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  document.addEventListener("click",schedule,true);
  schedule();
  return()=>{observer.disconnect();document.removeEventListener("click",schedule,true);if(frame)cancelAnimationFrame(frame)};
 },[]);
 return null;
}
