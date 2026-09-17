"use client";

import {useEffect} from "react";

export default function YnotDealsAutoOpen(){
 useEffect(()=>{
  const clickPeek=()=>{
   const button=document.querySelector<HTMLButtonElement>(".ynot-peek");
   if(!button)return false;
   button.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,view:window}));
   return true;
  };
  const openDeals=()=>{
   if(clickPeek())return;
   let tries=0;
   const retry=()=>{if(clickPeek())return;if(tries++<40)window.setTimeout(retry,75)};
   retry();
  };
  const onPress=(event:Event)=>{
   const target=event.target as Element|null;
   const button=target?.closest<HTMLButtonElement>(".ynot-world-row button");
   if(!button||button.textContent?.trim().toUpperCase()!=="YNOT")return;
   event.preventDefault();
   event.stopPropagation();
   openDeals();
  };
  window.addEventListener("ynot:open-deals",openDeals);
  document.addEventListener("click",onPress,true);
  const params=new URLSearchParams(window.location.search);
  if(params.get("deals")==="1")openDeals();
  return()=>{
   window.removeEventListener("ynot:open-deals",openDeals);
   document.removeEventListener("click",onPress,true);
  }
 },[]);
 return null;
}
