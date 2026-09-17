"use client";

import {useEffect} from "react";

export default function YnotDealsAutoOpen(){
 useEffect(()=>{
  const clickPeek=()=>{
   const button=document.querySelector<HTMLButtonElement>(".ynot-peek");
   if(!button)return false;
   button.click();
   return true;
  };
  const openDeals=()=>{
   if(clickPeek())return;
   let tries=0;
   const retry=()=>{if(clickPeek())return;if(tries++<30)window.setTimeout(retry,100)};
   retry();
  };
  window.addEventListener("ynot:open-deals",openDeals);
  const params=new URLSearchParams(window.location.search);
  if(params.get("deals")==="1")openDeals();
  return()=>window.removeEventListener("ynot:open-deals",openDeals)
 },[]);
 return null;
}
