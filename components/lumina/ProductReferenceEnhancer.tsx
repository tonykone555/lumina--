"use client";

import {useEffect} from "react";

const GALLERIES=".lv4-gallery,.ynot-rich-gallery,.ynot-loaded-gallery";

function decorateGallery(gallery:HTMLElement){
 const buttons=[...gallery.querySelectorAll<HTMLButtonElement>(":scope > button")];
 if(!buttons.length)return;
 buttons.forEach((button,index)=>{
  button.classList.toggle("ynot-reference-hidden-thumb",index>3);
  button.classList.remove("ynot-reference-more-thumb");
  button.removeAttribute("data-more");
 });
 const remaining=Math.max(0,buttons.length-4);
 if(remaining>0&&buttons[3]){
  buttons[3].classList.add("ynot-reference-more-thumb");
  buttons[3].dataset.more=`+${remaining}`;
 }
}

function decorateProductModal(root:ParentNode=document){
 root.querySelectorAll<HTMLElement>(GALLERIES).forEach(decorateGallery);
 root.querySelectorAll<HTMLElement>(".lv4-detailcopy").forEach(copy=>{
  copy.querySelector<HTMLElement>(".lv4-direction-row")?.classList.add("ynot-reference-directions");
  copy.querySelector<HTMLElement>(".lv4-tagrow,.ynot-card-tags")?.classList.add("ynot-reference-tags");
  copy.querySelector<HTMLElement>(".ynot-description-toggle")?.classList.add("ynot-reference-description");
 });
}

export default function ProductReferenceEnhancer():null{
 useEffect(()=>{
  let frame=0;
  const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;decorateProductModal()})};
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,childList:true});
  document.addEventListener("click",schedule,true);
  schedule();
  return()=>{observer.disconnect();document.removeEventListener("click",schedule,true);if(frame)cancelAnimationFrame(frame)};
 },[]);
 return null;
}
