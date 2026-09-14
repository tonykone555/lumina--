"use client";

import {useEffect} from "react";

function clearInjected(root:Element){root.querySelectorAll(".ynot-loaded-gallery,.ynot-loaded-variants,.ynot-rich-gallery,.ynot-rich-variants,.ynot-description-back").forEach(x=>x.remove());root.querySelectorAll<HTMLElement>("[data-ynot-hydrated]").forEach(x=>delete x.dataset.ynotHydrated)}
function sync(){const ynot=document.querySelector<HTMLElement>(".ynot-selected");if(ynot){const title=ynot.querySelector("h3")?.textContent?.trim()||"";if(title&&ynot.dataset.productTitle!==title){clearInjected(ynot);delete ynot.dataset.ynotVariantId;ynot.dataset.productTitle=title}}
 const story=document.querySelector<HTMLElement>(".ynot-story");if(story){const title=story.querySelector("h2")?.textContent?.trim()||"";if(title&&story.dataset.productTitle!==title){clearInjected(story);delete story.dataset.ynotVariantId;story.dataset.productTitle=title}}}
export default function ProductCardSync():null{useEffect(()=>{let raf=0;const run=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(sync)};const observer=new MutationObserver(run);observer.observe(document.body,{subtree:true,childList:true,characterData:true});document.addEventListener("click",run,true);run();return()=>{observer.disconnect();cancelAnimationFrame(raf);document.removeEventListener("click",run,true)}},[]);return null}
