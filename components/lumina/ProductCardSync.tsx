"use client";

import {useEffect} from "react";

function clearInjected(root:Element){
 root.querySelectorAll(".ynot-loaded-gallery,.ynot-loaded-variants,.ynot-rich-gallery,.ynot-rich-variants,.ynot-description-back,.ynot-mini-slider,.ynot-origin-dot").forEach(x=>x.remove());
 root.querySelectorAll<HTMLElement>("[data-ynot-hydrated],[data-ynot-slider]").forEach(x=>{delete x.dataset.ynotHydrated;delete x.dataset.ynotSlider});
 const shell=root.closest(".lv4-detail,.ynot-selected,.ynot-story") as HTMLElement|null;
 if(shell){delete shell.dataset.ynotVariantId;shell.classList.remove("ynot-description-flipped")}
}
function reconcile(card:HTMLElement,titleSelector:string){const title=card.querySelector(titleSelector)?.textContent?.trim()||"";if(!title)return;if(card.dataset.productTitle&&card.dataset.productTitle!==title)clearInjected(card);card.dataset.productTitle=title}
function sync(){document.querySelectorAll<HTMLElement>(".lv4-detail").forEach(card=>reconcile(card,"h2"));document.querySelectorAll<HTMLElement>(".ynot-selected").forEach(card=>reconcile(card,"h3"));document.querySelectorAll<HTMLElement>(".ynot-story").forEach(card=>reconcile(card,"h2"))}
export default function ProductCardSync():null{useEffect(()=>{let raf=0;const run=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(sync)};const observer=new MutationObserver(run);observer.observe(document.body,{subtree:true,childList:true,characterData:true});document.addEventListener("click",run,true);run();return()=>{observer.disconnect();cancelAnimationFrame(raf);document.removeEventListener("click",run,true)}},[]);return null}