"use client";

import {useEffect} from "react";

export default function YnotDealsAutoOpen(){
 useEffect(()=>{
  let lastOpen=0;
  const clickPeek=()=>{
   const button=document.querySelector<HTMLButtonElement>(".ynot-peek");
   if(!button)return false;
   button.click();
   return true;
  };
  const openDeals=()=>{
   if(clickPeek())return;
   let tries=0;
   const retry=()=>{if(clickPeek())return;if(tries++<50)window.setTimeout(retry,70)};
   retry();
  };
  const onPress=(event:Event)=>{
   const target=event.target as Element|null;
   const button=target?.closest<HTMLButtonElement>("button");
   if(!button||button.matches(".ynot-peek,[data-source-only=\"true\"],.ynot-source-trigger-clean")||button.closest(".ynot-drawer,.ynot-view-source"))return;
   // Never depend on translated visible copy. The header's YNOT control has a
   // stable structural location; translated labels can change freely.
   const isHeaderYnot=Boolean(button.closest(".ynot-world-row")&&button!==button.closest(".ynot-world-row")?.querySelector("button:first-child"));
   const isExplicit=button.getAttribute("data-ynot-action")==="open-deals";
   if(!isHeaderYnot&&!isExplicit)return;
   const now=Date.now();if(now-lastOpen<350)return;lastOpen=now;
   event.preventDefault();event.stopPropagation();
   openDeals();
  };
  window.addEventListener("ynot:open-deals",openDeals);
  document.addEventListener("pointerup",onPress,true);
  document.addEventListener("click",onPress,true);
  const params=new URLSearchParams(window.location.search);
  if(params.get("deals")==="1")openDeals();
  return()=>{
   window.removeEventListener("ynot:open-deals",openDeals);
   document.removeEventListener("pointerup",onPress,true);
   document.removeEventListener("click",onPress,true);
  }
 },[]);
 return null;
}
