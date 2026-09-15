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
  const directions=copy.querySelector<HTMLElement>(".lv4-direction-row");
  const tags=copy.querySelector<HTMLElement>(".lv4-tagrow,.ynot-card-tags");
  const description=copy.querySelector<HTMLElement>(".ynot-description-toggle");
  if(directions)directions.classList.add("ynot-reference-directions");
  if(tags)tags.classList.add("ynot-reference-tags");
  if(description)description.classList.add("ynot-reference-description");
 });
}

export default function ProductReferenceEnhancer():null{
 useEffect(()=>{
  let queued=false;
  const scan=()=>{queued=false;decorateProductModal()};
  const queue=()=>{if(queued)return;queued=true;queueMicrotask(scan)};
  const observer=new MutationObserver(queue);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  scan();
  return()=>observer.disconnect();
 },[]);
 return null;
}
