"use client";

import {useEffect} from "react";

const GALLERIES=".lv4-gallery,.ynot-rich-gallery,.ynot-loaded-gallery";

function buildSlider(gallery:HTMLElement,startIndex:number){
 const detail=gallery.closest<HTMLElement>(".lv4-detail");
 if(!detail)return;
 const images=[...gallery.querySelectorAll<HTMLImageElement>(":scope > button img")].map(img=>img.src).filter(Boolean);
 if(!images.length)return;
 document.querySelector(".ynot-full-slider")?.remove();
 detail.classList.add("ynot-gallery-slider-active");
 let index=Math.max(0,Math.min(startIndex,images.length-1));
 const slider=document.createElement("section");
 slider.className="ynot-full-slider";
 slider.dataset.ynotViewportSlider="1";
 const image=document.createElement("img");
 image.className="ynot-full-slider-image";
 image.alt="Product view";
 const count=document.createElement("span");
 count.className="ynot-full-slider-count";
 const prev=document.createElement("button");
 prev.type="button";prev.className="ynot-full-slider-prev";prev.setAttribute("aria-label","Previous image");prev.textContent="‹";
 const next=document.createElement("button");
 next.type="button";next.className="ynot-full-slider-next";next.setAttribute("aria-label","Next image");next.textContent="›";
 const close=document.createElement("button");
 close.type="button";close.className="ynot-full-slider-close";close.setAttribute("aria-label","Back to product");close.textContent="←";
 const render=()=>{image.src=images[index];count.textContent=`${index+1} / ${images.length}`;prev.disabled=images.length<2;next.disabled=images.length<2};
 prev.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();index=(index-1+images.length)%images.length;render()});
 next.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();index=(index+1)%images.length;render()});
 close.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();detail.classList.remove("ynot-gallery-slider-active");slider.remove()});
 slider.append(image,close,prev,next,count);
 document.body.appendChild(slider);
 render();
}

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
  const trigger=buttons[3];
  trigger.classList.add("ynot-reference-more-thumb");
  trigger.dataset.more=`+${remaining}`;
  if(trigger.dataset.sliderBound!=="1"){
   trigger.dataset.sliderBound="1";
   trigger.addEventListener("click",event=>{
    event.preventDefault();event.stopPropagation();
    buildSlider(gallery,3);
   },true);
  }
 }
}

function decorateProductModal(root:ParentNode=document){
 if(!document.querySelector(".lv4-detail"))document.querySelector(".ynot-full-slider[data-ynot-viewport-slider='1']")?.remove();
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
  return()=>{observer.disconnect();document.removeEventListener("click",schedule,true);if(frame)cancelAnimationFrame(frame);document.querySelector(".ynot-full-slider[data-ynot-viewport-slider='1']")?.remove()};
 },[]);
 return null;
}
