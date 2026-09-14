"use client";

import {useEffect} from "react";

function enhanceGallery(gallery:HTMLElement){
 if(gallery.dataset.ynotSlider==="1")return;
 const thumbs=[...gallery.querySelectorAll<HTMLButtonElement>(":scope > button")].filter(button=>!button.classList.contains("ynot-slider-prev")&&!button.classList.contains("ynot-slider-next"));
 if(thumbs.length<2)return;
 gallery.dataset.ynotSlider="1";
 gallery.classList.add("ynot-mini-slider");
 let index=Math.max(0,thumbs.findIndex(button=>button.classList.contains("active")));
 thumbs.forEach((button,i)=>{button.classList.add("ynot-slide-thumb");button.classList.toggle("is-current",i===index)});
 const prev=document.createElement("button"),next=document.createElement("button"),counter=document.createElement("span");
 prev.type="button";next.type="button";prev.className="ynot-slider-prev";next.className="ynot-slider-next";counter.className="ynot-slider-counter";
 prev.setAttribute("aria-label","Previous product image");next.setAttribute("aria-label","Next product image");prev.textContent="‹";next.textContent="›";
 const show=(nextIndex:number)=>{index=(nextIndex+thumbs.length)%thumbs.length;thumbs.forEach((button,i)=>button.classList.toggle("is-current",i===index));counter.textContent=`${index+1} / ${thumbs.length}`;thumbs[index]?.click()};
 prev.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();show(index-1)});
 next.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();show(index+1)});
 counter.textContent=`${index+1} / ${thumbs.length}`;
 gallery.prepend(prev);gallery.append(counter,next);
}

function enhanceAllGalleries(){document.querySelectorAll<HTMLElement>(".lv4-gallery,.ynot-rich-gallery,.ynot-loaded-gallery").forEach(enhanceGallery)}

export default function WorldVisualPolish():null{
 useEffect(()=>{let frame=0;const sync=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(enhanceAllGalleries)};sync();const observer=new MutationObserver(sync);observer.observe(document.body,{subtree:true,childList:true});return()=>{cancelAnimationFrame(frame);observer.disconnect()}},[]);
 return null;
}
