"use client";

import { useEffect } from "react";

function readText(root:Element|null,selector:string){return root?.querySelector(selector)?.textContent?.trim()||""}
function priceNumber(text:string){const match=text.replace(/\s/g,"").match(/(\d+(?:[.,]\d+)?)/);if(!match)return null;const value=Number(match[1].replace(",","."));return Number.isFinite(value)?value:null}
function currencyPrefix(text:string){if(text.includes("€"))return"€";if(text.includes("£"))return"£";if(text.includes("$"))return"$";return""}
function setReactInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}))}

export default function YnotIntentBridge(){
 useEffect(()=>{
  const handler=(event:MouseEvent)=>{
   const target=event.target as HTMLElement|null;
   const button=target?.closest(".lv4-direction-row button") as HTMLButtonElement|null;
   if(!button)return;
   const action=button.textContent?.trim()||"";
   if(!["More like this","Cheaper","More premium","Same shape"].includes(action))return;

   const detail=button.closest(".lv4-detail");
   const title=readText(detail,"h2");
   if(!title)return;
   const brand=readText(detail,".lv4-product-brand");
   const priceText=readText(detail,".lv4-detailcopy > strong");
   const price=priceNumber(priceText);
   const currency=currencyPrefix(priceText);
   const tags=[...detail!.querySelectorAll(".lv4-tagrow button")].map(el=>el.textContent?.trim()).filter(Boolean).slice(0,3).join(" ");
   const context=[title,brand,tags].filter(Boolean).join(" ");
   let query=`${context} similar products`;
   if(action==="Cheaper")query=price?`${context} cheaper alternatives under ${currency}${Math.max(1,Math.floor(price*.9))}`:`${context} cheaper alternatives best value`;
   if(action==="More premium")query=`${context} premium alternatives higher quality`;
   if(action==="Same shape")query=`${context} same shape same silhouette similar style`;

   event.preventDefault();
   event.stopPropagation();
   const input=document.querySelector(".ynot-search input") as HTMLInputElement|null;
   if(input)setReactInput(input,query);
   (document.querySelector(".ynot-peek") as HTMLButtonElement|null)?.click();
   window.setTimeout(()=>{const live=document.querySelector(".ynot-search input") as HTMLInputElement|null;if(live){if(live.value!==query)setReactInput(live,query);live.focus()}},80);
  };
  document.addEventListener("click",handler,true);
  return()=>document.removeEventListener("click",handler,true);
 },[]);
 return null;
}
