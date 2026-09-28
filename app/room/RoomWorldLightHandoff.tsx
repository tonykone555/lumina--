"use client";

import {useEffect} from "react";

export default function RoomWorldLightHandoff(){
 useEffect(()=>{
  const markLight=()=>{
   try{
    sessionStorage.setItem("ynot-room-return-light","1");
    localStorage.setItem("ynot-theme","light");
   }catch{}
  };
  const onClick=(event:MouseEvent)=>{
   const target=event.target as Element|null;
   const link=target?.closest("a[href]") as HTMLAnchorElement|null;
   if(!link)return;
   try{
    const url=new URL(link.href,window.location.href);
    if(url.origin===window.location.origin&&url.pathname==="/")markLight();
   }catch{}
  };
  window.addEventListener("pagehide",markLight);
  document.addEventListener("click",onClick,true);
  return()=>{window.removeEventListener("pagehide",markLight);document.removeEventListener("click",onClick,true)};
 },[]);
 return null;
}
